import Vue from 'vue';
import extensions from './extensions';
import ScreenRendererError from '../components/renderer/screen-renderer-error';
import ScreenBase from './ScreenBase';

export default {
  mixins: extensions,
  props: {
    value: Object,
    definition: Object,
    components: {
      type: Object,
      default() {
        return {};
      },
    },
  },
  data() {
    return {
      references__: [],
      debugCmp: null,
      component: null,
      alias: {},
      extensions: [],
      nodeNameProperty: 'component',
      variables: [],
      initialize: [],
      ownerDocument: window.document,
    };
  },
  methods: {
    submit() {
      this.$emit('submit', this.value);
    },
    buildComponent() {
      const component = this.componentDefinition();
      const warnHandler = Vue.config.warnHandler;
      const errorHandler = Vue.config.errorHandler;
      const errors = [];
      let VueComponent;
      try {
        Vue.config.warnHandler = err => {
          errors.push(err);
        };
        Vue.config.errorHandler = err => {
          errors.push(err);
        };
        VueComponent = Vue.component('ScreenRedered', component);
        const instance = new VueComponent({
          propsData: {
            vdata: {},
          },
        });
        instance.$parent = this;
        instance.$mount();
        if (errors.length > 0) {
          throw 'Building error';
        }
        this.codigo = component;
        return VueComponent;
      } catch (error) {
        return {
          components: { ScreenRendererError },
          data() {
            return { component, error, errors };
          },
          template: '<screen-renderer-error :component="component" :error="error" :errors="errors" />',
        };
      } finally {
        Vue.config.warnHandler = warnHandler;
        Vue.config.errorHandler = errorHandler;
      }
    },
    parse() {
      const owner = this.ownerDocument.createElement('div');
      this.loadPages(this.definition.config, owner);
      return '<div>' + owner.innerHTML + '</div>';
    },
    loadPages(pages, owner) {
      this.variables.splice(0);
      // Extensions.onloadproperties
      this.extensions.forEach((ext) => ext.beforeload instanceof Function && ext.beforeload.bind(this)({ pages, owner }));
      pages.forEach((page, index) => {
        const component = this.createComponent('div', {name: page.name, class:'page', 'v-if': `currentPage__==${index}`});
        this.loadItems(page.items, component);
        owner.appendChild(component);
      });
    },
    escapeVuePropertyName(name) {
      return name.substr(0, 1) === '@' ? name.replace('@', 'v-on:') : this.snakeCase(name);
    },
    snakeCase(name) {
      return name.replace(/[A-Z]/g, m => `-${m}`).toLowerCase().replace(/^-/, '');
    },
    createComponent(nodeName, properties) {
      nodeName = this.snakeCase(nodeName);
      const node = this.ownerDocument.createElement(nodeName);
      for (let property in properties) {
        const value = properties[property];
        if (value !== false && value !== null && value !== undefined) {
          if (property.substr(0,1) === ':' || (typeof value === 'string' && value.indexOf('{{') === -1)) {
            node.setAttribute(this.escapeVuePropertyName(property), value);
          } else if (value !== undefined) {
            node.setAttribute(':' + this.escapeVuePropertyName(property), this.byValue(value));
          }
        }
      }
      return node;
    },
    // convert to json and escape interpolation
    byValue(value) {
      return JSON.stringify(value).replace('{{', '\x7b\x7b').replace('}}', '\x7d\x7d');
    },
    byRef(value) {
      const index = this.references__.indexOf(value) > -1 ? this.references__.indexOf(value) : this.references__.length;
      const reference = `references__[${index}]`;
      this.references__.push(value);
      return reference;
    },
    loadItems(items, component) {
      items.forEach(element => {
        const componentName = element[this.nodeNameProperty];
        const nodeName = this.alias[componentName] || componentName;
        const properties = { ...element.config };
        // Extensions.onloadproperties
        this.extensions.forEach((ext) => ext.onloadproperties instanceof Function && ext.onloadproperties.bind(this)({ properties, element, component, items, nodeName, componentName }));
        // Create component
        const node = this.createComponent(nodeName, properties);
        // Extensions.onloaditems to add items to container
        this.extensions.forEach((ext) => ext.onloaditems instanceof Function && ext.onloaditems.bind(this)({ properties, element, component, items, nodeName, componentName, node }));
        // Append node
        component.appendChild(node);
      });
    },
    registerVariable(name, config = {}) {
      if (!name) {
        return;
      }
      const find = this.variables.find(v => v.name === name);
      if (!find) {
        this.variables.push({ name, config });
      }
    },
    elementCssClass(element) {
      const css = [];
      element.config.bgcolor ? css.push(element.config.bgcolor) : null;
      element.config.color ? css.push(element.config.color) : null;
      return css.join(' ');
    },
    componentDefinition() {
      let component;
      try {
        const template = this.parse();
        // Extensions.onparse
        this.extensions.forEach((ext) => {
          ext.onparse instanceof Function ? ext.onparse.bind(this)(template) : null;
        });
        component = {
          mixins: [ScreenBase],
          components: {}, //this.components,
          props: {},
          computed: {},
          methods: {},
          data: {},
          watch: {},
          template,
          mounted: [],
        };
        // Extensions.onbuild
        this.extensions.forEach((ext) => {
          ext.onbuild instanceof Function ? ext.onbuild.bind(this)(component) : null;
        });
        // Build data
        component.data = new Function('const data = {};' + Object.keys(component.data).map(key => `this.setValue(${JSON.stringify(key)}, ${component.data[key]}, data);`).join('\n') + 'return data;');
        // Build watchers
        Object.keys(component.watch).forEach((key) => {
          const watch = { deep: true };
          component.watch[key].forEach(w => Object.assign(watch, w.options));
          watch.handler = new Function('value', component.watch[key].map(w => w.code).join('\n'));
          component.watch[key] = watch;
        });
        // Build mounted
        component.mounted = new Function(component.mounted.join('\n'));
        return component;
      } catch (error) {
        return {
          components: { ScreenRendererError },
          data() {
            return { component, error, errors: [] };
          },
          template: '<screen-renderer-error :component="component" :error="error" :errors="errors" />',
        };
      }
    },
    addData(screen, name, code) {
      screen.data[name] = code;
    },
    addWatch(screen, name, code, options = {}) {
      if (screen.watch[name]) {
        screen.watch[name].push({code, options});
      } else {
        screen.watch[name] = [{code, options}];
      }
    },
    addMounted(screen, code) {
      screen.mounted.push(code);
    },
  },
};