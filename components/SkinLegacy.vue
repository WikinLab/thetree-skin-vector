<template>
  <SkinLegacyOrigin
    :data="skinData"
    :intercept-events="['submit']"
    @submit="submitSearch"
    @click="onSkinClick($event)"
  >
    <template #html-site-notice>
      <div v-if="siteNoticeHtml" id="siteNotice">
        <div id="localNotice" data-nosnippet>
          <div class="sitenotice">
            <p v-html="siteNoticeHtml"></p>
          </div>
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
        <button
          type="button"
          class="tt-usermessage-close"
          aria-label="사용자 토론 알림 닫기"
          @click="dismissUserDiscussion"
        >×</button>
      </div>

      <alert v-if="isShowACLMessage && editAclMessageHtml" error closable @close="isShowACLMessage = false">
        <span v-html="editAclMessageHtml"></span>
        <span v-if="requestable"><br>대신 <nuxt-link :to="editRequestTarget">편집 요청</nuxt-link>을 생성할 수 있습니다.</span>
      </alert>
    </template>

    <template #html-body-content>
      <div
        id="mw-content-text"
        key="mw-content-text"
        data-tt-host-content="1"
        :data-tt-host-content-name="adapterContext.pageContract.hostContentName || null"
      >
        <slot />
      </div>
    </template>

    <template #html-categories>
      <RawHtmlFragment :html="skinData['html-categories'] || ''" />
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
import VectorSettingModal from './VectorSettingModal';
import { getLegacyDocument, makeTheTreeAdapterContext, makeViewItems } from '../lib/legacyTheTreeAdapter';
import { makeSkinLegacyData } from '../lib/legacySkinData';
import { buildLegacyTitleHeadingData } from '../lib/legacyTitleData';
import { getSearchModeFromSubmitEvent, makeSearchSubmitTargetForContext } from '../lib/legacySearchSubmit';
import { makeSkinLegacyAdapterState } from '../lib/legacySkinAdapter';
import { makeLegacyMediaWikiLanguageContext } from '../lib/legacyMediaWikiMessages';
import { isDarkModeToggleTarget, toggleTheTreeDarkMode } from '../lib/adapters/mediawiki-darkmode';
import { createTheTreeSearchSuggestRuntime } from '../lib/adapters/thetree-search-suggest';
import { isSettingsToggleTarget } from '../lib/adapters/thetree-settings';
import { createVectorRuntimeController } from '../lib/runtime/createVectorRuntimeController.js';

export default {
  name: 'SkinLegacy',
  mixins: [Common],
  components: {
    Alert,
    RawHtmlFragment,
    SkinLegacyOrigin
  },
  data() {
    return {
      isShowACLMessage: true,
      vectorRuntimeController: null
    };
  },
  computed: {
    adapterContext() {
      return makeTheTreeAdapterContext({
        storeState: this.$store.state,
        route: this.$route,
        linkBuilders: {
          documentAction: (document, action, query) => this.doc_action_link(document, action, query),
          userDocument: (name, type) => this.user_doc(name, type),
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
      this.resetVectorRuntime();
    },
    document() {
      this.resetVectorRuntime();
    },
    baseViewItems() {
      this.resetVectorRuntime();
    }
  },
  mounted() {
    this.initVectorRuntime();
  },
  beforeDestroy() {
    this.teardownVectorRuntime();
  },
  beforeUnmount() {
    this.teardownVectorRuntime();
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
      const settingsToggle = isSettingsToggleTarget(event && event.target);
      if (settingsToggle) {
        event.preventDefault();
        event.stopPropagation();
        this.$vfm.show({ component: VectorSettingModal });
        return;
      }
      this.onDynamicContentClick(event);
    },
    dismissUserDiscussion() {
      const value = this.skinAdapter.userDiscussionKey;
      if (!value) return;
      if (typeof this.$store.commit === 'function') {
        this.$store.commit('localConfigSetValue', {
          key: 'wiki.hide_user_document_discuss',
          value
        });
      } else if (typeof this.$store.state.localConfigSetValue === 'function') {
        this.$store.state.localConfigSetValue('wiki.hide_user_document_discuss', value);
      }
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
    ensureVectorRuntimeController() {
      if (this.vectorRuntimeController) return this.vectorRuntimeController;
      this.vectorRuntimeController = createVectorRuntimeController({
        getVectorRuntimeOptions: () => ({
          pageReady: {
            loadSearchModule: (moduleName) => {
              if (moduleName !== 'mediawiki.searchSuggest') return null;
              const config = this.adapterContext.config || {};
              const language = makeLegacyMediaWikiLanguageContext({
                lang: config.lang || config['wiki.lang'] || 'ko',
                dir: config.dir || config['wiki.dir'] || 'ltr',
                config
              });
              const searchTarget = (query) => ({ path: '/Search', query: { q: query } });
              const runtime = createTheTreeSearchSuggestRuntime({
                requestSuggestions: (query, signal) => this.internalRequest(
                  `/Complete?q=${encodeURIComponent(query)}`,
                  { signal, noProgress: true }
                ),
                navigateDocument: (title) => this.$router.push(this.doc_action_link(title, 'w')),
                navigateSearch: (query) => this.$router.push(searchTarget(query)),
                documentHref: (title) => this.$router.resolve(this.doc_action_link(title, 'w')).href,
                searchHref: (query) => this.$router.resolve(searchTarget(query)).href,
                specialLabel: language.resourceLoaderMessages['searchsuggest-containing']
              });
              runtime.init();
              return runtime;
            }
          }
        }),
        schedule: (callback) => this.$nextTick(callback)
      });
      return this.vectorRuntimeController;
    },
    initVectorRuntime() {
      this.ensureVectorRuntimeController().init();
    },
    teardownVectorRuntime() {
      if (this.vectorRuntimeController) this.vectorRuntimeController.destroy();
      this.vectorRuntimeController = null;
    },
    resetVectorRuntime() {
      this.ensureVectorRuntimeController().reset();
    }
  }
};
</script>
