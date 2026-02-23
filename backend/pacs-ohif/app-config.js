/** @type {AppTypes.Config} */
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
        qidoRoot: 'http://35.230.172.150:8042/dicom-web',
        wadoRoot: 'http://35.230.172.150:8042/dicom-web',
        wadoUriRoot: 'http://35.230.172.150:8042/wado',
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

