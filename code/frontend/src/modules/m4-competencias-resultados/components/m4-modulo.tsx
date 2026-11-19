import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alerta, Campo, Pestanas } from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'

import {
  agregarPrueba, cancelarCompetencia, consultarRanking, consultarRendimiento, crearCompetencia,
  corregirResultado, detalleCompetencia, editarCompetencia, listarCategorias, listarCompetencias,
  listarElegibles, listarParticipantes, listarResultados, preseleccionar, publicarCompetencia,
  listarCorrecciones, publicarResultados, registrarResultado, solicitarInscripcion,
} from '../services/m4.service.ts'
import { PERMISOS_M4, type CategoriaM4, type CompetenciaM4, type ElegibleM4, type FilaRankingM4,
  type FilaResultadoM4, type ParticipanteM4, type RendimientoM4, type ResultadoInscripcionM4, type CorreccionM4 } from '../types/m4.types.ts'

type Pestana = 'competencias' | 'inscripciones' | 'resultados' | 'rendimiento' | 'administracion'
const fechaLocal = (fecha:Date) => new Date(fecha.getTime()-fecha.getTimezoneOffset()*60000).toISOString().slice(0,16)
const HOY = fechaLocal(new Date())
const FECHA_MAS = fechaLocal(new Date(Date.now()+86400000*30))
const fechaHoraTexto = (iso:string) => new Date(iso).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'})
const tiempoTexto = (ms:number|null) => ms===null ? 'No finalizó' : `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`
const mensajeError = (e:unknown) => e instanceof Error ? e.message : 'No fue posible completar la operación.'
const estadoTexto:Record<string,string> = {BORRADOR:'Programada',PUBLICADA:'Publicada',CANCELADA:'Cancelada',FINALIZADA:'Finalizada'}

export function M4Modulo() {
  const { tienePermiso, sesion } = useSesion()
  const [pestana,setPestana] = useState<Pestana>('competencias')
  const [competencias,setCompetencias] = useState<CompetenciaM4[]>([])
  const [categorias,setCategorias] = useState<CategoriaM4[]>([])
  const [seleccion,setSeleccion] = useState<number>(0)
  const [aviso,setAviso] = useState('')
  const [error,setError] = useState('')
  const [cargando,setCargando] = useState(false)
  const puedeGestionar=tienePermiso(PERMISOS_M4.competenciaGestionar)
  const puedeInscribir=tienePermiso(PERMISOS_M4.inscripcionGestionar)
  const puedeRegistrar=tienePermiso(PERMISOS_M4.resultadoRegistrar)
  const puedeConsultar=tienePermiso(PERMISOS_M4.resultadoConsultar)
  const puedeAdministrar=tienePermiso(PERMISOS_M4.resultadoAdministrar)
  const puedePublicar=tienePermiso(PERMISOS_M4.resultadoPublicar)

  const recargar=useCallback(async()=>{ try {
    const listado=await listarCompetencias()
    const completos=await Promise.all(listado.map(c=>detalleCompetencia(c.id)))
    setCompetencias(completos); setError('')
  } catch(e){setError(mensajeError(e))} },[])
  useEffect(()=>{ void recargar(); if(puedeGestionar) listarCategorias().then(setCategorias).catch(e=>setError(mensajeError(e))) },[recargar,puedeGestionar,sesion?.id])
  const activa=competencias.find(c=>c.id===seleccion) ?? competencias[0]
  const [nombre,setNombre]=useState('')
  const [lugar,setLugar]=useState('')
  const [tipo,setTipo]=useState('INTERNA')
  const [fecha,setFecha]=useState(FECHA_MAS)
  const [apertura,setApertura]=useState(HOY)
  const [cierre,setCierre]=useState(FECHA_MAS.slice(0,10)+'T12:00')
  const [modalidad,setModalidad]=useState('VELOCIDAD')
  const [distancia,setDistancia]=useState('300')
  const [categoriaId,setCategoriaId]=useState('')
  const [genero,setGenero]=useState('MIXTO')
  const [descripcion,setDescripcion]=useState('')

  const [elegibles,setElegibles]=useState<ElegibleM4[]>([])
  const [marcados,setMarcados]=useState<number[]>([])
  const [pruebaId,setPruebaId]=useState<number>(0)
  const [patinadorId,setPatinadorId]=useState<number>(0)
  const [confirmar,setConfirmar]=useState(false)
  const [inscripcionResultado,setInscripcionResultado]=useState<ResultadoInscripcionM4|null>(null)

  const [participantes,setParticipantes]=useState<ParticipanteM4[]>([])
  const [tiempos,setTiempos]=useState<Record<number,string>>({})
  const [dnf,setDnf]=useState<number[]>([])
  const [resultados,setResultados]=useState<FilaResultadoM4[]>([])
  const [avisoRecord,setAvisoRecord]=useState('')
  const [correcciones,setCorrecciones]=useState<CorreccionM4[]>([])
  const [ranking,setRanking]=useState<FilaRankingM4[]>([])
  const [idRendimiento,setIdRendimiento]=useState('')
  const [rendimiento,setRendimiento]=useState<RendimientoM4|null>(null)
  const [correccion,setCorreccion]=useState<{id:number;tiempo:string;motivo:string;dnf:boolean}|null>(null)

  const pruebas=useMemo(()=>competencias.flatMap(c=>(c.pruebas??[]).map(p=>({...p,competenciaNombre:c.nombre,competenciaId:c.id}))),[competencias])

  const ejecutar=async(trabajo:()=>Promise<unknown>,exito:string)=>{setCargando(true);setError('');setAviso('');try{await trabajo();setAviso(exito);await recargar()}catch(e){setError(mensajeError(e))}finally{setCargando(false)}}

  const guardarCompetencia=async(e:FormEvent)=>{e.preventDefault();await ejecutar(async()=>{
    if(!(new Date(apertura)<new Date(cierre)&&new Date(cierre)<new Date(fecha))) throw new Error('Las fechas deben cumplir: apertura < cierre de inscripciones < fecha del evento.')
    await crearCompetencia({nombre,fechaHora:new Date(fecha).toISOString(),lugar,tipo:tipo as any,aperturaInscripciones:new Date(apertura).toISOString(),cierreInscripciones:new Date(cierre).toISOString()})
    setNombre('');setLugar('')
  },'Competencia creada con estado Programada.')}
  const agregar=async(e:FormEvent)=>{e.preventDefault();if(!activa) return;await ejecutar(async()=>{
    if(!categoriaId) throw new Error('Selecciona una categoría.')
    await agregarPrueba({competenciaId:activa.id,modalidad,distanciaMetros:Number(distancia),categoriaId:Number(categoriaId),genero,descripcion})
    const det=await detalleCompetencia(activa.id);setCompetencias(cs=>cs.map(c=>c.id===activa.id?det:c))
  },'Prueba asociada a la competencia.')}
  const abrirElegibles=async(id:number)=>{setSeleccion(id);setMarcados([]);try{setElegibles(await listarElegibles(id))}catch(e){setError(mensajeError(e))}}
  const guardarPreseleccion=async()=>{if(!seleccion||!marcados.length)return;await ejecutar(async()=>{await preseleccionar(seleccion,marcados);setElegibles(await listarElegibles(seleccion));setMarcados([])},'Preselección guardada.')}
  const solicitar=async()=>{if(!pruebaId||!patinadorId){setError('Selecciona una prueba y un patinador.');return}await ejecutar(async()=>{
    const r=await solicitarInscripcion(pruebaId,patinadorId,confirmar)
    setInscripcionResultado(r)
  },'Solicitud procesada.')}
  const cargarParticipantes=async(id:number)=>{setPruebaId(id);try{setParticipantes(await listarParticipantes(id));setResultados(await listarResultados(id))}catch(e){setError(mensajeError(e))}}
  const guardarTiempo=async(p:ParticipanteM4)=>{await ejecutar(async()=>{
    const respuesta=await registrarResultado({inscripcionId:p.inscripcionId,tiempo:dnf.includes(p.inscripcionId)?undefined:tiempos[p.inscripcionId],noFinalizo:dnf.includes(p.inscripcionId)})
    if(respuesta.recordPersonal?.nuevoRecord) setAvisoRecord(`¡Nuevo récord personal! Mejor marca ${tiempoTexto(respuesta.recordPersonal.mejorTiempoMs)}${respuesta.recordPersonal.diferenciaMs!==null?` · Mejoró ${respuesta.recordPersonal.diferenciaMs} ms`:''}.`)
    await cargarParticipantes(pruebaId)
  },`Resultado guardado para ${p.patinador}.`)}
  const cargarRanking=async()=>{try{setRanking(await consultarRanking())}catch(e){setError(mensajeError(e))}}
  const cargarRendimiento=async()=>{try{setRendimiento(await consultarRendimiento(Number(idRendimiento)))}catch(e){setError(mensajeError(e))}}
  const descargarCSV=()=>{const filas=[['Puesto','Patinador','Categoría','Tiempo','Puntos'],...resultados.map(r=>[r.puesto??'—',r.patinador,r.categoria,tiempoTexto(r.tiempoMs),r.puntos])];const csv=filas.map(f=>f.map(x=>`"${String(x).replaceAll('"','""')}"`).join(';')).join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='resultados-m4.csv';a.click();URL.revokeObjectURL(url)}

  return <div className="app-page">
    <header className="app-head"><div className="vl-stack"><nav className="vl-breadcrumb"><span>Deporte</span><span>/</span><span aria-current="page">Módulo M4</span></nav><h1>Competencias y resultados</h1><p className="vl-text-body-sm">Gestión de eventos, inscripciones, marcas y rendimiento deportivo.</p></div></header>
    {error&&<Alerta tono="error" titulo="No se pudo completar la operación"><p>{error}</p></Alerta>}
    {aviso&&<Alerta tono="success"><p>{aviso}</p></Alerta>}
    <Pestanas etiqueta="Secciones del módulo M4" activa={pestana} alCambiar={setPestana} opciones={[
      {id:'competencias',texto:'Competencias'},
      ...(puedeInscribir?[{id:'inscripciones' as const,texto:'Inscripciones'}]:[]),
      ...(puedeRegistrar?[{id:'resultados' as const,texto:'Resultados'}]:[]),
      ...(puedeConsultar?[{id:'rendimiento' as const,texto:'Rendimiento'}]:[]),
      ...((puedeAdministrar||puedePublicar)?[{id:'administracion' as const,texto:'Administración'}]:[]),
    ]}/>

    {pestana==='competencias'&&<section className="vl-stack">
      {puedeGestionar&&<div className="vl-card vl-stack"><div><h2 className="vl-text-heading-h5">Crear competencia</h2><p className="vl-text-body-sm">Registra el evento y su período de inscripción.</p></div>
        <form className="vl-filter-bar" onSubmit={guardarCompetencia}>
          <Campo etiqueta="Nombre" id="m4-nombre" obligatorio><input className="vl-input" id="m4-nombre" required value={nombre} onChange={e=>setNombre(e.target.value)}/></Campo>
          <Campo etiqueta="Tipo" id="m4-tipo"><select className="vl-select" id="m4-tipo" value={tipo} onChange={e=>setTipo(e.target.value)}><option>INTERNA</option><option>FEDERADA</option><option>FESTIVAL</option></select></Campo>
          <Campo etiqueta="Lugar" id="m4-lugar" obligatorio><input className="vl-input" id="m4-lugar" required value={lugar} onChange={e=>setLugar(e.target.value)}/></Campo>
          <Campo etiqueta="Fecha del evento" id="m4-fecha"><input className="vl-input" id="m4-fecha" type="datetime-local" value={fecha} onChange={e=>setFecha(e.target.value)}/></Campo>
          <Campo etiqueta="Apertura de inscripciones" id="m4-apertura"><input className="vl-input" id="m4-apertura" type="datetime-local" value={apertura} onChange={e=>setApertura(e.target.value)}/></Campo>
          <Campo etiqueta="Cierre de inscripciones" id="m4-cierre"><input className="vl-input" id="m4-cierre" type="datetime-local" value={cierre} onChange={e=>setCierre(e.target.value)}/></Campo>
          <div className="app-actions"><button className="vl-button vl-button--primary" disabled={cargando}>Guardar competencia</button></div>
        </form>
      </div>}
      <div className="vl-card vl-stack"><div className="app-head"><div><h2 className="vl-text-heading-h5">Competencias registradas</h2><p className="vl-text-body-sm">Estados: Programada, Publicada, Cancelada y Finalizada.</p></div><button className="vl-button vl-button--secondary" onClick={()=>void recargar()}>Actualizar</button></div>
        <div className="vl-table-wrap"><table className="vl-table"><thead><tr><th>Competencia</th><th>Fecha</th><th>Lugar</th><th>Pruebas</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
          {competencias.map(c=><tr key={c.id}><td><b>{c.nombre}</b><span className="app-bloque vl-text-caption">{c.tipo}</span></td><td>{fechaHoraTexto(c.fechaHora)}</td><td>{c.lugar}</td><td>{c.totalPruebas??c.pruebas?.length??0}</td><td><span className="vl-badge">{estadoTexto[c.estado]}</span></td><td><div className="app-row-menu">
            <button className="vl-button vl-button--ghost vl-button--sm" onClick={()=>setSeleccion(c.id)}>Seleccionar</button>
            {puedeGestionar&&c.estado==='BORRADOR'&&<button className="vl-button vl-button--ghost vl-button--sm" onClick={()=>{const nuevoNombre=prompt('Nombre de la competencia',c.nombre);if(!nuevoNombre)return;const nuevoLugar=prompt('Lugar de la competencia',c.lugar);if(nuevoLugar)void ejecutar(()=>editarCompetencia(c.id,{nombre:nuevoNombre,lugar:nuevoLugar}),'Competencia modificada.')}}>Editar</button>}
            {puedeGestionar&&c.estado==='BORRADOR'&&<button className="vl-button vl-button--secondary vl-button--sm" onClick={()=>void ejecutar(()=>publicarCompetencia(c.id),'Competencia publicada.')}>Publicar</button>}
            {sesion?.roles.includes('ADMINISTRADOR')&&c.estado!=='CANCELADA'&&c.estado!=='FINALIZADA'&&<button className="vl-button vl-button--ghost vl-button--sm" onClick={()=>{const motivo=prompt('Motivo de cancelación');if(motivo)void ejecutar(()=>cancelarCompetencia(c.id,motivo),'Competencia cancelada.')}}>Cancelar</button>}
          </div></td></tr>)}
          {!competencias.length&&<tr><td colSpan={6}>No hay competencias registradas.</td></tr>}
        </tbody></table></div>
      </div>
      {puedeGestionar&&activa&&<div className="vl-card vl-stack"><h2 className="vl-text-heading-h5">Configurar pruebas · {activa.nombre}</h2>
        <form className="vl-filter-bar" onSubmit={agregar}>
          <Campo etiqueta="Modalidad" id="m4-modalidad"><select id="m4-modalidad" className="vl-select" value={modalidad} onChange={e=>setModalidad(e.target.value)}>{['CONTRARRELOJ','PUNTOS','ELIMINACION','RELEVOS','VELOCIDAD','FONDO'].map(x=><option key={x}>{x}</option>)}</select></Campo>
          <Campo etiqueta="Distancia (metros)" id="m4-distancia"><input id="m4-distancia" className="vl-input" type="number" min="1" value={distancia} onChange={e=>setDistancia(e.target.value)}/></Campo>
          <Campo etiqueta="Categoría" id="m4-categoria"><select id="m4-categoria" className="vl-select" value={categoriaId} onChange={e=>setCategoriaId(e.target.value)}><option value="">Selecciona</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Campo>
          <Campo etiqueta="Género" id="m4-genero"><select id="m4-genero" className="vl-select" value={genero} onChange={e=>setGenero(e.target.value)}><option>FEMENINO</option><option>MASCULINO</option><option>MIXTO</option></select></Campo>
          <Campo etiqueta="Descripción" id="m4-descripcion"><input id="m4-descripcion" className="vl-input" value={descripcion} onChange={e=>setDescripcion(e.target.value)}/></Campo>
          <div className="app-actions"><button className="vl-button vl-button--primary">Agregar prueba</button></div>
        </form>
        <ul>{(activa.pruebas??[]).map(p=><li key={p.id}>{p.modalidad} · {p.distanciaMetros} m · {p.categorias.map(x=>`${x.categoria} (${x.genero})`).join(', ')}</li>)}</ul>
      </div>}
    </section>}

    {pestana==='inscripciones'&&<section className="vl-stack">
      <div className="vl-card vl-stack"><h2 className="vl-text-heading-h5">Preselección de patinadores</h2>
        <Campo etiqueta="Competencia publicada" id="m4-comp-ins"><select className="vl-select" id="m4-comp-ins" value={seleccion||''} onChange={e=>void abrirElegibles(Number(e.target.value))}><option value="">Selecciona competencia</option>{competencias.filter(c=>c.estado==='PUBLICADA').map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Campo>
        {elegibles.map(p=><label className="vl-check-row" key={p.id}><input className="vl-radio" type="checkbox" checked={marcados.includes(p.id)||p.preseleccionado} disabled={p.preseleccionado} onChange={e=>setMarcados(ids=>e.target.checked?[...ids,p.id]:ids.filter(x=>x!==p.id))}/><span>{p.nombre} · {p.categoria} · {p.edad} años {p.preseleccionado?'· Preseleccionado':''}</span></label>)}
        {puedeGestionar&&<button className="vl-button vl-button--primary" disabled={!marcados.length||cargando} onClick={()=>void guardarPreseleccion()}>Confirmar preselección ({marcados.length})</button>}
      </div>
      <div className="vl-card vl-stack"><h2 className="vl-text-heading-h5">Solicitar inscripción</h2><p className="vl-text-body-sm">El sistema valida póliza, cartera, autorización del acudiente y sanciones. El resultado es automático.</p>
        <Campo etiqueta="Prueba" id="m4-prueba-ins"><select className="vl-select" id="m4-prueba-ins" value={pruebaId||''} onChange={e=>setPruebaId(Number(e.target.value))}><option value="">Selecciona una prueba</option>{pruebas.filter(p=>competencias.find(c=>c.id===p.competenciaId)?.estado==='PUBLICADA').map(p=><option key={p.id} value={p.id}>{p.competenciaNombre} · {p.modalidad} {p.distanciaMetros} m</option>)}</select></Campo>
        <Campo etiqueta="Patinador preseleccionado" id="m4-patinador-ins"><select className="vl-select" id="m4-patinador-ins" value={patinadorId||''} onChange={e=>setPatinadorId(Number(e.target.value))}><option value="">Selecciona patinador</option>{elegibles.filter(p=>p.preseleccionado).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Campo>
        {sesion?.roles.includes('ACUDIENTE')&&<label className="vl-check-row"><input className="vl-radio" type="checkbox" checked={confirmar} onChange={e=>setConfirmar(e.target.checked)}/> Confirmo la autorización digital del acudiente.</label>}
        <button className="vl-button vl-button--primary" disabled={!puedeInscribir||cargando} onClick={()=>void solicitar()}>Enviar solicitud y validar</button>
        {inscripcionResultado&&<div className="vl-card vl-stack"><h3 className="vl-text-heading-h5">Solicitud #{inscripcionResultado.id} · {inscripcionResultado.estado}</h3>
          {inscripcionResultado.validaciones.map(v=><div className="vl-check-row" key={v.tipo}><span aria-hidden="true">{v.aprobada?'✓':'!'}</span><span><b>{v.tipo}</b><span className="app-bloque vl-text-caption">{v.aprobada?'Cumple':'No cumple'} · {v.detalle}</span></span></div>)}
        </div>}
      </div>
    </section>}

    {pestana==='resultados'&&<section className="vl-stack">
      <div className="vl-card vl-stack"><h2 className="vl-text-heading-h5">Registro de tiempos</h2>
        <Campo etiqueta="Prueba disputada" id="m4-prueba-res"><select className="vl-select" id="m4-prueba-res" value={pruebaId||''} onChange={e=>void cargarParticipantes(Number(e.target.value))}><option value="">Selecciona una prueba</option>{pruebas.map(p=><option key={p.id} value={p.id}>{p.competenciaNombre} · {p.modalidad} {p.distanciaMetros} m</option>)}</select></Campo>
        <p className="vl-text-body-sm">Formato requerido: MM:SS.mmm. Solo aparecen inscripciones aprobadas.</p>
        <div className="vl-table-wrap"><table className="vl-table"><thead><tr><th>Patinador</th><th>Categoría</th><th>Tiempo</th><th>No finalizó</th><th></th></tr></thead><tbody>
          {participantes.map(p=><tr key={p.inscripcionId}><td>{p.patinador}</td><td>{p.categoria}</td><td><input className="vl-input" placeholder="00:45.123" value={tiempos[p.inscripcionId]??(p.tiempoMs?tiempoTexto(p.tiempoMs):'')} onChange={e=>setTiempos(t=>({...t,[p.inscripcionId]:e.target.value}))}/></td><td><input className="vl-radio" type="checkbox" checked={dnf.includes(p.inscripcionId)} onChange={e=>setDnf(a=>e.target.checked?[...a,p.inscripcionId]:a.filter(x=>x!==p.inscripcionId))}/></td><td><button className="vl-button vl-button--primary vl-button--sm" disabled={!puedeRegistrar} onClick={()=>void guardarTiempo(p)}>Guardar</button></td></tr>)}
        </tbody></table></div>
      </div>
      {avisoRecord&&<Alerta tono="success"><p>{avisoRecord}</p></Alerta>}
      <div className="vl-card vl-stack"><h2 className="vl-text-heading-h5">Tabla de resultados</h2><div className="vl-table-wrap"><table className="vl-table"><thead><tr><th>Puesto</th><th>Patinador</th><th>Categoría</th><th>Tiempo</th><th>Puntos</th></tr></thead><tbody>{resultados.map((r,i)=><tr key={r.resultadoId??`pendiente-${i}`}><td>{r.puesto??'—'}</td><td>{r.patinador}</td><td>{r.categoria}</td><td>{tiempoTexto(r.tiempoMs)}</td><td>{r.puntos}</td></tr>)}</tbody></table></div></div>
    </section>}

    {pestana==='rendimiento'&&<section className="vl-stack">
      <div className="vl-card vl-stack"><h2 className="vl-text-heading-h5">Historial y récord personal</h2><div className="vl-filter-bar"><Campo etiqueta="ID del patinador" id="m4-rend-id"><input className="vl-input" id="m4-rend-id" type="number" min="1" value={idRendimiento} onChange={e=>setIdRendimiento(e.target.value)}/></Campo><button className="vl-button vl-button--primary" onClick={()=>void cargarRendimiento()} disabled={!idRendimiento}>Consultar historial</button></div>
        {rendimiento&&<><h3 className="vl-text-heading-h5">Mejores marcas</h3><div className="vl-table-wrap"><table className="vl-table"><thead><tr><th>Prueba</th><th>Distancia</th><th>Récord personal</th></tr></thead><tbody>{rendimiento.records.map(r=><tr key={r.pruebaId}><td>{r.modalidad}</td><td>{r.distancia} m</td><td>{tiempoTexto(r.recordMs)}</td></tr>)}</tbody></table></div>
        <h3 className="vl-text-heading-h5">Historial de competencias</h3><div className="vl-table-wrap"><table className="vl-table"><thead><tr><th>Competencia</th><th>Fecha</th><th>Prueba</th><th>Tiempo</th><th>Puesto</th></tr></thead><tbody>{rendimiento.historial.map((r,i)=><tr key={i}><td>{r.competencia}</td><td>{fechaHoraTexto(r.fecha)}</td><td>{r.modalidad} · {r.distancia} m</td><td>{tiempoTexto(r.tiempoMs)}</td><td>{r.puesto??'—'}</td></tr>)}</tbody></table></div></>}
      </div>
      <div className="vl-card vl-stack"><div className="app-head"><div><h2 className="vl-text-heading-h5">Ranking acumulado</h2><p className="vl-text-body-sm">Ordenado por puntos registrados en los resultados.</p></div><button className="vl-button vl-button--secondary" onClick={()=>void cargarRanking()}>Consultar ranking</button></div>
        <div className="vl-table-wrap"><table className="vl-table"><thead><tr><th>Puesto</th><th>Patinador</th><th>Categoría</th><th>Nivel</th><th>Puntos</th><th>Competencias</th></tr></thead><tbody>{ranking.map(r=><tr key={r.patinadorId}><td>{r.puesto}</td><td>{r.patinador}</td><td>{r.categoria}</td><td>{r.nivel}</td><td>{r.puntos}</td><td>{r.competencias}</td></tr>)}</tbody></table></div>
      </div>
    </section>}

    {pestana==='administracion'&&<section className="vl-stack">
      {puedeAdministrar&&<div className="vl-card vl-stack"><h2 className="vl-text-heading-h5">Corregir resultado</h2><p className="vl-text-body-sm">Solo Administrador. El motivo es obligatorio y se conserva el valor anterior en la auditoría.</p>
        <Campo etiqueta="Prueba" id="m4-prueba-auditoria"><select className="vl-select" id="m4-prueba-auditoria" value={pruebaId||''} onChange={e=>{const id=Number(e.target.value);setPruebaId(id);setResultados([]);if(id)listarResultados(id).then(setResultados).catch(err=>setError(mensajeError(err)))}}><option value="">Selecciona una prueba</option>{pruebas.map(p=><option key={p.id} value={p.id}>{p.competenciaNombre} · {p.modalidad} {p.distanciaMetros} m</option>)}</select></Campo>
        <Campo etiqueta="Resultado" id="m4-correccion"><select className="vl-select" id="m4-correccion" value={correccion?.id??''} onChange={e=>{const id=Number(e.target.value);setCorreccion(id?{id,tiempo:'',motivo:'',dnf:false}:null);setCorrecciones([]);if(id)listarCorrecciones(id).then(setCorrecciones).catch(err=>setError(mensajeError(err)))}}><option value="">Selecciona un resultado cargado</option>{resultados.filter(r=>r.resultadoId!==null).map(r=><option key={r.resultadoId} value={r.resultadoId??''}>#{r.resultadoId} · {r.patinador} · {tiempoTexto(r.tiempoMs)}</option>)}</select></Campo>
        {correccion&&<><Campo etiqueta="Nuevo tiempo MM:SS.mmm" id="m4-corr-tiempo"><input className="vl-input" id="m4-corr-tiempo" value={correccion.tiempo} onChange={e=>setCorreccion({...correccion,tiempo:e.target.value})} disabled={correccion.dnf}/></Campo><label className="vl-check-row"><input className="vl-radio" type="checkbox" checked={correccion.dnf} onChange={e=>setCorreccion({...correccion,dnf:e.target.checked})}/> Marcar No finalizó</label><Campo etiqueta="Motivo obligatorio" id="m4-corr-motivo"><textarea className="vl-textarea" id="m4-corr-motivo" value={correccion.motivo} onChange={e=>setCorreccion({...correccion,motivo:e.target.value})}/></Campo><button className="vl-button vl-button--primary" disabled={!puedeAdministrar||correccion.motivo.trim().length<5} onClick={()=>void ejecutar(async()=>{await corregirResultado(correccion.id,{tiempo:correccion.dnf?undefined:correccion.tiempo,noFinalizo:correccion.dnf,motivo:correccion.motivo});setResultados(await listarResultados(pruebaId));setCorreccion(null)},'Resultado corregido y auditoría registrada.')}>Guardar corrección</button></>}
        {correcciones.length>0&&<><h3 className="vl-text-heading-h5">Historial de correcciones</h3><div className="vl-table-wrap"><table className="vl-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Valor anterior</th><th>Valor nuevo</th><th>Motivo</th></tr></thead><tbody>{correcciones.map(x=><tr key={x.id}><td>{fechaHoraTexto(x.corregidoEn)}</td><td>{x.corregidoPor??'—'}</td><td>{x.noFinalizoAnterior?'No finalizó':tiempoTexto(x.tiempoAnteriorMs)}</td><td>{x.noFinalizoNuevo?'No finalizó':tiempoTexto(x.tiempoNuevoMs)}</td><td>{x.motivo}</td></tr>)}</tbody></table></div></>}
      </div>}
      <div className="vl-card vl-stack"><h2 className="vl-text-heading-h5">Publicar resultados</h2><Campo etiqueta="Competencia" id="m4-pub-comp"><select className="vl-select" id="m4-pub-comp" value={seleccion||''} onChange={e=>setSeleccion(Number(e.target.value))}><option value="">Selecciona competencia</option>{competencias.filter(c=>c.estado==='PUBLICADA').map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Campo><button className="vl-button vl-button--primary" disabled={!puedePublicar||!seleccion} onClick={()=>void ejecutar(()=>publicarResultados(seleccion),'Resultados publicados. La competencia pasa a estado Finalizada.')}>Publicar resultados consolidados</button>
        <div className="vl-filter-bar"><button className="vl-button vl-button--secondary" onClick={descargarCSV} disabled={!resultados.length}>Exportar CSV</button><button className="vl-button vl-button--secondary" onClick={()=>window.print()} disabled={!resultados.length}>Imprimir / Guardar PDF</button></div>
      </div>
    </section>}
  </div>
}
