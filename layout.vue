<template>
  <div
    :class="rootClassList"
    :style="skinVars"
    :lang="legacyDocumentEnvironment.htmlAttributes.lang"
    :dir="legacyDocumentEnvironment.htmlAttributes.dir"
    :data-tt-skin-variant="skinVariantId"
    :data-tt-content-projection="activeContentProjection ? activeContentProjection.id : null"
    :data-tt-content-transform="activeContentProjection ? projectionTransformSignature : null"
    @click.capture="onContentProjectionClick"
  >
    <SkinLegacy :content-projection="activeContentProjection">
      <nuxt />
    </SkinLegacy>
  </div>
</template>

<style>
@import "./css/screen.css";
</style>

<script>
import SkinLegacy from './components/SkinLegacy';
import { applyLegacyDocumentEnvironment, makeLegacyDocumentEnvironment } from './lib/legacyDocumentEnvironment';
import { makeTheTreeAdapterContext } from './lib/legacyTheTreeAdapter';
import { makeLegacySkinVars, makeLegacyThemeColor } from './lib/legacySkinVars';
import { SKIN_VARIANT_ID } from './lib/skinVariant.js';
import contentProjectionLayer from './projection/lib/contentProjectionLayer.js';

export default {
  name: 'TheTreeVectorSkin',
  components: {
    SkinLegacy
  },
  data() {
    return {
      contentProjectionLayer,
      contentProjectionStoreRuntime: null,
      legacyDocumentCleanup: null,
      projectionTransformSignature: 'source-content',
      skinVariantId: SKIN_VARIANT_ID
    };
  },
  created() {
    this.installContentProjectionStoreRuntime();
  },
  beforeUpdate() {
    this.syncContentProjectionStoreRuntime();
  },
  head() {
    return {
      htmlAttrs: {
        ...this.legacyDocumentEnvironment.htmlAttributes,
        class: this.legacyDocumentEnvironment.htmlClasses.join(' ')
      },
      bodyAttrs: {
        class: this.legacyDocumentEnvironment.bodyClasses.join(' ')
      },
      meta: [
        { name: 'theme-color', content: this.themeColor }
      ]
    };
  },
  computed: {
    adapterContext() {
      return makeTheTreeAdapterContext({
        storeState: this.$store.state,
        route: this.$route
      });
    },
    activeContentProjection() {
      return this.contentProjectionLayer.isEnabled(this.adapterContext)
        ? this.contentProjectionLayer
        : null;
    },
    legacyDocumentEnvironment() {
      const config = this.$store.state.config || {};
      const pageContract = this.adapterContext.pageContract;
      return makeLegacyDocumentEnvironment({
        lang: config.lang || config['wiki.lang'] || 'ko',
        dir: config.dir || config['wiki.dir'] || 'ltr',
        namespace: pageContract.namespaceId,
        action: pageContract.actionKind,
        theme: this.$store.state.currentTheme
      });
    },
    rootClassList() {
      return {
        ...Object.fromEntries(this.legacyDocumentEnvironment.rootClasses.map((className) => [className, true]))
      };
    },
    themeColor() {
      return makeLegacyThemeColor(this.$store.state.config || {}, this.$store.state.currentTheme);
    },
    skinVars() {
      return makeLegacySkinVars({
        config: this.$store.state.config || {},
        documentEnvironment: this.legacyDocumentEnvironment
      });
    },
  },
  watch: {
    legacyDocumentEnvironment: {
      deep: true,
      handler() {
        this.syncLegacyDocumentEnvironment();
      }
    }
  },
  mounted() {
    this.syncLegacyDocumentEnvironment();
  },
  beforeDestroy() {
    this.teardownContentProjectionStoreRuntime();
    this.teardownLegacyDocumentEnvironment();
  },
  beforeUnmount() {
    this.teardownContentProjectionStoreRuntime();
    this.teardownLegacyDocumentEnvironment();
  },
  methods: {
    onContentProjectionClick(event) {
      this.contentProjectionLayer.handleClick(event, {
        adapterContext: this.adapterContext,
        storeState: this.$store.state
      });
    },
    installContentProjectionStoreRuntime() {
      const projection = this.activeContentProjection;
      if (!projection || !projection.createStoreRuntime || this.contentProjectionStoreRuntime) return;
      this.contentProjectionStoreRuntime = projection.createStoreRuntime({
        getState: () => this.$store.state,
        onUpdate: (signature) => {
          this.projectionTransformSignature = signature;
        }
      });
      this.contentProjectionStoreRuntime.init();
    },
    syncContentProjectionStoreRuntime() {
      if (this.contentProjectionStoreRuntime) this.contentProjectionStoreRuntime.sync();
    },
    teardownContentProjectionStoreRuntime() {
      if (this.contentProjectionStoreRuntime) this.contentProjectionStoreRuntime.destroy();
      this.contentProjectionStoreRuntime = null;
    },
    syncLegacyDocumentEnvironment() {
      this.teardownLegacyDocumentEnvironment();
      this.legacyDocumentCleanup = applyLegacyDocumentEnvironment(this.legacyDocumentEnvironment);
    },
    teardownLegacyDocumentEnvironment() {
      if (this.legacyDocumentCleanup) {
        this.legacyDocumentCleanup();
        this.legacyDocumentCleanup = null;
      }
    }
  }
};
</script>
