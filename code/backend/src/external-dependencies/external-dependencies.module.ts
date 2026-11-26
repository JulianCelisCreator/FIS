import { Module } from '@nestjs/common';
import { G4SedesCarteraMockAdapter } from './adapters/g4-sedes-cartera.mock.adapter.js';
import { M1UsuariosMockAdapter } from './adapters/m1-usuarios.mock.adapter.js';
import { M2DeportivoMockAdapter } from './adapters/m2-deportivo.mock.adapter.js';
import { M4CompetenciasMockAdapter } from './adapters/m4-competencias.mock.adapter.js';
import { M6PersonalMockAdapter } from './adapters/m6-personal.mock.adapter.js';
import {
  PUERTO_G4_SEDES_CARTERA,
  PUERTO_M1_USUARIOS,
  PUERTO_M2_DEPORTIVO,
  PUERTO_M4_COMPETENCIAS,
  PUERTO_M6_PERSONAL,
} from './interfaces/external-dependencies.interfaces.js';

@Module({
  providers: [
    M1UsuariosMockAdapter,
    M2DeportivoMockAdapter,
    G4SedesCarteraMockAdapter,
    M4CompetenciasMockAdapter,
    M6PersonalMockAdapter,
    {
      provide: PUERTO_M1_USUARIOS,
      useExisting: M1UsuariosMockAdapter,
    },
    {
      provide: PUERTO_M2_DEPORTIVO,
      useExisting: M2DeportivoMockAdapter,
    },
    {
      provide: PUERTO_G4_SEDES_CARTERA,
      useExisting: G4SedesCarteraMockAdapter,
    },
    {
      provide: PUERTO_M4_COMPETENCIAS,
      useExisting: M4CompetenciasMockAdapter,
    },
    {
      provide: PUERTO_M6_PERSONAL,
      useExisting: M6PersonalMockAdapter,
    },
  ],
  exports: [
    PUERTO_M1_USUARIOS,
    PUERTO_M2_DEPORTIVO,
    PUERTO_G4_SEDES_CARTERA,
    PUERTO_M4_COMPETENCIAS,
    PUERTO_M6_PERSONAL,
    M1UsuariosMockAdapter,
    M2DeportivoMockAdapter,
    G4SedesCarteraMockAdapter,
    M4CompetenciasMockAdapter,
    M6PersonalMockAdapter,
  ],
})
export class ExternalDependenciesModule {}
