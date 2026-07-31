<template>
  <div
    :class="rootClassList"
    :style="skinVars"
    :lang="legacyDocumentEnvironment.htmlAttributes.lang"
    :dir="legacyDocumentEnvironment.htmlAttributes.dir"
    :data-tt-skin-variant="skinVariantId"
    :data-tt-content-projection="activeContentProjection ? activeContentProjection.id : null"
    :data-tt-content-transform="contentTransformSignature"
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
import vectorContentProjection from './projection/lib/contentProjection';
import { resolveContentProjectionPreference } from './projection/lib/adapters/thetree-content-projection.js';

export default {
  name: 'TheTreeVectorSkin',
  components: {
    SkinLegacy
  },
  data() {
    return {
      legacyDocumentCleanup: null,
      contentStoreRuntime: null,
      contentTransformSignature: 'projection-pending',
      contentProjection: vectorContentProjection,
      skinVariantId: SKIN_VARIANT_ID
    };
  },
  created() {
    this.installContentStoreRuntime();
  },
  beforeUpdate() {
    this.syncContentStoreRuntime();
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
    projectionPreference() {
      return resolveContentProjectionPreference(this.adapterContext);
    },
    activeContentProjection() {
      return this.projectionPreference.enabled ? this.contentProjection : null;
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
    this.teardownContentStoreRuntime();
    this.teardownLegacyDocumentEnvironment();
  },
  beforeUnmount() {
    this.teardownContentStoreRuntime();
    this.teardownLegacyDocumentEnvironment();
  },
  methods: {
    installContentStoreRuntime() {
      if (this.contentStoreRuntime) return;
      if (!this.activeContentProjection) {
        this.contentTransformSignature = 'source-content';
        return;
      }
      this.contentStoreRuntime = this.activeContentProjection.createStoreRuntime({
        store: this.$store,
        onUpdate: (signature) => {
          this.contentTransformSignature = signature;
        }
      });
      this.contentStoreRuntime.init();
    },
    syncContentStoreRuntime() {
      if (this.contentStoreRuntime) this.contentStoreRuntime.sync();
    },
    teardownContentStoreRuntime() {
      if (this.contentStoreRuntime) this.contentStoreRuntime.destroy();
      this.contentStoreRuntime = null;
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
