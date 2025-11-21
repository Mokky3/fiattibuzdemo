import commandsModule from './commandsModule';

export default {
  id: 'monai-extension',
  getCommandsModule() {
    return commandsModule;
  },
  getToolbarModule() {
    return {
      definitions: [
        {
          id: 'runAI',
          label: 'Run AI',
          icon: 'ai', // optional: pick another OHIF icon if needed
          type: 'command',
          commandName: 'runMonaiInference',
        },
      ],
      defaultContext: 'VIEWER',
    };
  },
};
