export default [
  {
    name: 'Variable',
    fields: [
      { name: 'name', hideFor: 'FormImage' },
      'fieldValue',
      'dataFormat',
      'validation',
      'readonly',
      'initiallyChecked',
    ],
    open: true,
  },
  {
    name: 'Configuration',
    fields: [
      { name: 'name', showFor: 'FormImage' },
      'image',
      'eventData',
      'label',
      'type',
      'placeholder',
      'content',
      'helper',
      'Multiselect checkbox (doesn’t exist)',
      'richtext',
      'rows',
      { name: 'options', showFor: 'FormMultiColumn' },
      'form',
      'editable',
    ],
    open: false,
  },
  {
    name: 'Data Source',
    fields: [
      'fields',
      { name: 'options', hideFor: 'FormMultiColumn' },
    ],
    open: false,
  },
  {
    name: 'Design',
    fields: ['color', 'bgcolor', 'variant', 'toggle', 'height', 'width'],
    open: false,
  },
  {
    name: 'Advanced',
    fields: ['conditionalHide', 'selector'],
    open: false,
  },
];
