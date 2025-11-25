window.config = {
  routerBasename: '/',
  showStudyList: true,
  extensions: [],
  modes: ['@ohif/mode-longitudinal'],
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
        wadoUriRoot: 'http://localhost:8043/wado',
        qidoRoot: 'http://localhost:8043/dicom-web',
        wadoRoot: 'http://localhost:8043/dicom-web',
        qidoSupportsIncludeField: true,
        supportsReject: true,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
      },
    },
  ],
};
