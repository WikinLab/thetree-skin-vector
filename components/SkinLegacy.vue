<template>
  <SkinLegacyOrigin
    :data="skinData"
    :intercept-events="['submit']"
    @submit="submitSearch"
    @click="onSkinClick($event)"
  >
    <template #html-site-notice>
      <div v-if="siteNoticeHtml" id="siteNotice" class="mw-body-content">
        <div id="localNotice">
          <span v-html="siteNoticeHtml"></span>
        </div>
      </div>
    </template>

    <template #html-title-heading>
      <RawHtmlFragment v-if="titleHeadingHtml" :html="titleHeadingHtml" />
      <h1 v-else id="firstHeading" class="firstHeading mw-first-heading">
        <span class="mw-page-title-main">{{ pageTitle }}</span>
      </h1>
    </template>

    <template #html-user-message>
      <div v-if="hasUnreadUserDiscussion" class="usermessage">
        현재 진행 중인 <nuxt-link :to="userDiscussionTarget">사용자 토론</nuxt-link>이 있습니다.
      </div>

      <alert v-if="isShowACLMessage && editAclMessageHtml" error closable @close="isShowACLMessage = false">
        <span v-html="editAclMessageHtml"></span>
        <span v-if="requestable"><br>대신 <nuxt-link :to="editRequestTarget">편집 요청</nuxt-link>을 생성할 수 있습니다.</span>
      </alert>
    </template>

    <template #html-body-content>
      <div
        id="mw-content-text"
        ref="contentText"
        key="mw-content-text"
        :class="projectionRootBinding.classList"
        v-bind="projectionRootBinding.attributes"
        data-tt-host-content="1"
        :data-tt-host-content-name="adapterContext.pageContract.hostContentName || null"
      >
        <slot />
      </div>
    </template>

    <template #html-categories>
      <RawHtmlFragment v-if="!contentProjection" :html="skinData['html-categories'] || ''" />
      <div
        v-else-if="projectionCategoryData.hasCategories"
        id="catlinks"
        class="catlinks"
        data-mw="interface"
        data-tt-vector-category-slot="1"
        data-tt-vector-catlinks-surface="1"
      >
        <div id="mw-normal-catlinks" class="mw-normal-catlinks">
          <span class="mw-catlinks-label">{{ projectionCategoryData.label }}</span>:
          <ul>
            <li
              v-for="category in projectionCategoryData.items"
              :key="category.id"
              :class="category.itemClasses"
            >
              <nuxt-link :to="category.to" :class="category.linkClasses">{{ category.text }}</nuxt-link>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #html-after-content>
      <slot name="after-content" />
    </template>
  </SkinLegacyOrigin>
</template>

<script>
import Common from '~/mixins/common';
import Alert from '~/components/alert';

import SkinLegacyOrigin from './skin-legacy.vue';
import RawHtmlFragment from '../lib/legacyRawHtmlFragment';
import { getLegacyDocument, makeTheTreeAdapterContext, makeViewItems } from '../lib/legacyTheTreeAdapter';
import { makeSkinLegacyData } from '../lib/legacySkinData';
import { buildLegacyTitleHeadingData } from '../lib/legacyTitleData';
import { getSearchModeFromSubmitEvent, makeSearchSubmitTargetForContext } from '../lib/legacySearchSubmit';
import { makeSkinLegacyAdapterState } from '../lib/legacySkinAdapter';
import { isDarkModeToggleTarget, toggleTheTreeDarkMode } from '../lib/adapters/mediawiki-darkmode';
import { createProjectionRuntimeController } from '../projection/lib/runtime/createProjectionRuntimeController.js';

export default {
  name: 'SkinLegacy',
  mixins: [Common],
  props: {
    contentProjection: {
      type: Object,
      default: null
    }
  },
  components: {
    Alert,
    RawHtmlFragment,
    SkinLegacyOrigin
  },
  data() {
    return {
      isShowACLMessage: true,
      projectionRuntimeController: null
    };
  },
  computed: {
    adapterContext() {
      return makeTheTreeAdapterContext({
        storeState: this.$store.state,
        route: this.$route,
        linkBuilders: {
          documentAction: (document, action) => this.doc_action_link(document, action),
          userDocument: (name) => this.user_doc(name),
          contribution: (uuid) => this.contribution_link(uuid)
        }
      });
    },
    skinData() {
      return makeSkinLegacyData(this.adapterContext);
    },
    titleData() {
      return buildLegacyTitleHeadingData(this.adapterContext.page, this.adapterContext.pageContract);
    },
    titleHeadingHtml() {
      return this.skinData['html-title-heading'] || '';
    },
    pageTitle() {
      return this.titleData['page-title'] || '';
    },
    projectionSurface() {
      return this.contentProjection ? this.contentProjection.resolveSurface(this.adapterContext) : {};
    },
    projectionRootBinding() {
      return this.contentProjection
        ? this.contentProjection.contentRootBinding(this.projectionSurface, this.adapterContext)
        : { classList: {}, attributes: {} };
    },
    projectionCategoryData() {
      return this.contentProjection
        ? this.contentProjection.makeCategoryData(this.adapterContext)
        : { hasCategories: false, label: '', items: [] };
    },
    skinAdapter() {
      return makeSkinLegacyAdapterState(this.adapterContext);
    },
    siteNoticeHtml() {
      return this.skinAdapter.siteNoticeHtml;
    },
    document() {
      return getLegacyDocument(this.adapterContext);
    },
    baseViewItems() {
      return makeViewItems(this.adapterContext);
    },
    projectionRuntimeData() {
      return this.contentProjection
        ? this.contentProjection.makeRuntimeData(this.makeProjectionRuntimeContext())
        : {};
    },
    hasUnreadUserDiscussion() {
      return this.skinAdapter.hasUnreadUserDiscussion;
    },
    userDiscussionTarget() {
      return this.skinAdapter.userDiscussionTarget;
    },
    editAclMessageHtml() {
      return this.skinAdapter.editAclMessageHtml;
    },
    requestable() {
      return this.skinAdapter.requestable;
    },
    editRequestTarget() {
      return this.skinAdapter.editRequestTarget;
    }
  },
  watch: {
    $route() {
      this.isShowACLMessage = true;
      this.resetProjectionRuntime();
    },
    document() {
      this.resetProjectionRuntime();
    },
    baseViewItems() {
      this.resetProjectionRuntime();
    },
    contentProjection() {
      this.resetProjectionRuntime();
    }
  },
  mounted() {
    this.initProjectionRuntime();
  },
  beforeDestroy() {
    this.teardownProjectionRuntime();
  },
  beforeUnmount() {
    this.teardownProjectionRuntime();
  },
  methods: {
    onSkinClick(event) {
      const toggle = isDarkModeToggleTarget(event && event.target);
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        toggleTheTreeDarkMode(this.$store.state);
        return;
      }
      this.onDynamicContentClick(event);
    },
    submitSearch(event) {
      const form = event && event.target;
      const input = form && form.elements && form.elements.search;
      const q = String((input && input.value) || '').trim();
      if (!q) {
        if (input && typeof input.focus === 'function') {
          input.focus();
        }
        return;
      }

      const mode = getSearchModeFromSubmitEvent(event);
      const target = makeSearchSubmitTargetForContext(q, mode, this.adapterContext);
      this.$router.push(target);
    },
    ensureProjectionRuntimeController() {
      if (this.projectionRuntimeController) return this.projectionRuntimeController;
      const projection = this.contentProjection;
      const getRuntimeContext = () => this.makeProjectionRuntimeContext();
      this.projectionRuntimeController = createProjectionRuntimeController({
        createContentRuntime: projection && typeof projection.createMountedRuntime === 'function'
          ? (optionsSource) => projection.createMountedRuntime(optionsSource)
          : null,
        getContentRuntimeOptions: getRuntimeContext,
        getMediaWikiRuntimeData: () => this.projectionRuntimeData,
        getMediaWikiRuntimeOptions: () => projection ? projection.makeRuntimeOptions(getRuntimeContext()) : {},
        extensions: projection ? projection.createExtensions({
          getData: () => this.projectionRuntimeData,
          getOptions: () => projection.makeRuntimeOptions(getRuntimeContext())
        }) : [],
        getCapabilities: () => projection ? projection.capabilities : [],
        schedule: (callback) => this.$nextTick(callback)
      });
      return this.projectionRuntimeController;
    },
    requestTheTreePageData(path, { signal } = {}) {
      return this.internalRequest(path, { signal, noProgress: true });
    },
    makeProjectionRuntimeContext() {
      const config = this.$store.state.config || {};
      return {
        adapterContext: this.adapterContext,
        contentSurface: this.projectionSurface,
        getRoot: () => this.$refs.contentText || null,
        lang: config.lang || config['wiki.lang'] || 'ko',
        config,
        messages: config.mediaWikiMessages || config.mediawikiMessages || config.messages || null,
        hostCapabilities: {
          requestPageData: (path, requestOptions) => this.requestTheTreePageData(path, requestOptions)
        },
        settings: {
          getLocalConfig: () => {
            const state = this.$store.state;
            if (state.localConfigInitialized) return state.localConfig || {};
            try {
              return JSON.parse(window.localStorage.getItem('thetree_settings')) || {};
            } catch (error) {
              return state.localConfig || {};
            }
          },
          setLocalConfigValue: (key, value) => this.$store.state.localConfigSetValue(key, value)
        }
      };
    },
    initProjectionRuntime() {
      this.ensureProjectionRuntimeController().init();
    },
    teardownProjectionRuntime() {
      if (this.projectionRuntimeController) this.projectionRuntimeController.destroy();
      this.projectionRuntimeController = null;
    },
    resetProjectionRuntime() {
      this.ensureProjectionRuntimeController().reset();
    }
  }
};
</script>
