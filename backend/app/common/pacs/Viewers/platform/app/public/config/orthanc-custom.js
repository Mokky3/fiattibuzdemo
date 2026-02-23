window.config = {
  routerBasename: '/',
  showStudyList: true,
  extensions: [
    '@ohif/extension-cornerstone',
    './extensions/monai-extension/index.js',
  ],
  customizationService: {},
  whiteLabeling: {},
  defaultDataSourceName: 'dicomweb',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'Orthanc DICOMWeb',
        name: 'ORTHANC',
        wadoUriRoot: 'http://localhost:8042/wado',
        qidoRoot: 'http://localhost:8042/dicom-web',
        wadoRoot: 'http://localhost:8042/dicom-web',
        qidoSupportsIncludeField: true,
        supportsReject: true,
        imageRendering: 'wadouri',
        thumbnailRendering: 'wadouri',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
      },
    },
  ],
  servers: {
    dicomWeb: [
      {
        name: 'Orthanc DICOMWeb',
        wadoUriRoot: 'http://localhost:8042/wado',
        qidoRoot: 'http://localhost:8042/dicom-web',
        wadoRoot: 'http://localhost:8042/dicom-web',
        qidoSupportsIncludeField: true,
        imageRendering: 'wadouri',
        thumbnailRendering: 'wadouri',
      },
    ],
    monai: {
      enabled: true,
      url: 'http://localhost:8000',
    },
  },
  // This enables MONAI extension
  showOverlays: true,
  showAnnotationTools: true,
  showLayoutSelector: true,
  hotkeys: [],
};
