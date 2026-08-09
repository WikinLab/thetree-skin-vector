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
  name: 'TheTreeVectorDeviceDispatcher',
  components,
  computed: {
    deviceData() {
      return this.$store.state.page?.data?.thetreeVectorDevice || {};
    },
    requestedVariant() {
      if (this.deviceData.schema !== 'thetree-vector-device/v1') return 'vector';
      return this.deviceData.variant === 'minerva' ? 'minerva' : 'vector';
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
