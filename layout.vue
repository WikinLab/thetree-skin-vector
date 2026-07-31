<template>
  <div
    :class="rootClassList"
    :style="skinVars"
    :lang="legacyDocumentEnvironment.htmlAttributes.lang"
    :dir="legacyDocumentEnvironment.htmlAttributes.dir"
    :data-tt-skin-variant="skinVariantId"
    :data-tt-content-profile="activeContentProfile ? activeContentProfile.id : null"
    :data-tt-content-transform="activeContentProfile ? contentTransformSignature : null"
  >
    <SkinLegacy :content-profile="activeContentProfile">
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
import skinProfile from './lib/skinProfile.js';

export default {
  name: 'TheTreeVectorSkin',
  components: {
    SkinLegacy
  },
  data() {
    return {
      contentStoreRuntime: null,
      contentTransformSignature: 'source-content',
      legacyDocumentCleanup: null,
      skinProfile,
      skinVariantId: SKIN_VARIANT_ID
    };
  },
  created() {
    this.installContentStoreRuntime();
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
    activeContentProfile() {
      return this.skinProfile.isEnabled(this.adapterContext) ? this.skinProfile : null;
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
      const profile = this.activeContentProfile;
      if (!profile || typeof profile.createStoreRuntime !== 'function' || this.contentStoreRuntime) return;
      this.contentStoreRuntime = profile.createStoreRuntime({
        store: this.$store,
        onUpdate: (signature) => {
          this.contentTransformSignature = signature;
        }
      });
      this.contentStoreRuntime.init();
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
