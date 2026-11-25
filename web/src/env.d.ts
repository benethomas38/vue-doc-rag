/// <reference types="vite/client" />

/**
 * Les Web Components écrits avec d'autres frameworks. Vue n'a pas à connaître leur code :
 * chaque widget est vérifié par son propre tsconfig (React, Angular).
 * L'alias est résolu par Vite (voir web/vite.config.ts).
 */
declare module "@widgets/visualizer-react";
