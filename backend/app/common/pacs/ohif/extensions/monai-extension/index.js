import { Enums } from '@ohif/core';
import extension from './src/monaiExtension.js';


const { CommandsManager } = Enums;

const toolbarButtons = [
  {
    id: 'monaiRunAI',
    label: 'Run AI',
    icon: 'brain',
    type: 'action',
    commandName: 'runMONAIInference',
    context: 'VIEWER',
  },
];

const commandsModule = {
  definitions: {
    runMONAIInference: {
      commandFn: async ({ servicesManager }) => {
        const imageId = servicesManager.services.DisplaySetService.activeDisplaySets[0].displaySetInstanceUID;

        const response = await fetch('http://localhost:8000/infer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageId,
            model: 'deepedit',
          }),
        });

        const result = await response.json();
        console.log('MONAI Inference Result:', result);
        alert('MONAI Inference completed. Check console.');
      },
    },
  },
  defaultContext: 'VIEWER',
};

export default {
  id: 'monai-extension',
  getToolbarModule: () => ({ definitions: {}, defaultContext: 'VIEWER', toolbarButtons }),
  getCommandsModule: () => commandsModule,
  
};
