<template>
  <component :is="activeVariantComponent" />
</template>

<script>
import { defineAsyncComponent } from 'vue';
import {
  loadMinervaVariant,
  loadVectorVariant,
  suiteMode
} from './.skin-suite/generated/variant-loaders.js';

const components = {
  VectorVariantLayout: defineAsyncComponent(loadVectorVariant)
};
if (loadMinervaVariant) {
  components.MinervaVariantLayout = defineAsyncComponent(loadMinervaVariant);
}

export default {
  name: 'TheTreeMobileFrontendDispatcher',
  components,
  computed: {
    mobileFrontendData() {
      return this.$store.state.page?.data?.thetreeMobileFrontend || {};
    },
    requestedVariant() {
      if (this.mobileFrontendData.schema !== 'thetree-mobilefrontend/v1') return 'vector';
      return this.mobileFrontendData.mode === 'mobile' ? 'minerva' : 'vector';
    },
    activeVariantComponent() {
      if (
        suiteMode === 'vector-minerva'
        && this.requestedVariant === 'minerva'
        && loadMinervaVariant
      ) {
        return 'MinervaVariantLayout';
      }
      return 'VectorVariantLayout';
    }
  }
};
</script>
