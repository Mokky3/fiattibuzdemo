export default function({ servicesManager }) {
  return {
    definitions: {
      runMonaiInference: {
        commandFn: async function({ servicesManager }) {
          const { UINotificationService, DicomMetadataStore } = servicesManager.services;

          const studies = DicomMetadataStore.getStudies();
          const seriesUID = studies?.[0]?.series?.[0]?.SeriesInstanceUID;

          if (!seriesUID) {
            UINotificationService.show({
              title: 'MONAI',
              message: 'No series found',
              type: 'error',
            });
            return;
          }

          try {
            const res = await fetch('http://localhost:8000/infer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image: seriesUID,
                model: 'deepedit',
              }),
            });

            const result = await res.json();

            UINotificationService.show({
              title: 'MONAI',
              message: 'AI inference completed',
              type: 'success',
            });

            console.log('MONAI Inference Result:', result);
          } catch (err) {
            UINotificationService.show({
              title: 'MONAI',
              message: 'Inference failed',
              type: 'error',
            });
            console.error(err);
          }
        },
      },
    },
    defaultContext: 'VIEWER',
  };
}
