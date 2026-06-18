// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

const mockFetchSkills = vi.hoisted(() => vi.fn())
const mockFetchSkillContent = vi.hoisted(() => vi.fn())
const mockFetchPendingWrites = vi.hoisted(() => vi.fn())
const mockProfilesStore = vi.hoisted(() => ({
  activeProfileName: 'default',
  profiles: [{ name: 'default' }],
  fetchProfiles: vi.fn(),
}))

vi.mock('@/api/hermes/skills', () => ({
  fetchSkills: mockFetchSkills,
  fetchSkillContent: mockFetchSkillContent,
}))

vi.mock('@/api/hermes/write-gate', () => ({
  fetchPendingWrites: mockFetchPendingWrites,
}))

vi.mock('@/stores/hermes/profiles', () => ({
  useProfilesStore: () => mockProfilesStore,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('naive-ui', () => ({
  NBadge: defineComponent({
    props: ['value', 'max', 'show'],
    template: '<span class="n-badge-stub"><slot /></span>',
  }),
  NButton: defineComponent({
    emits: ['click'],
    template: '<button class="n-button-stub" type="button" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
  }),
  NDrawer: defineComponent({
    props: ['show'],
    template: '<div v-if="show" class="n-drawer-stub"><slot /></div>',
  }),
  NDrawerContent: defineComponent({
    props: ['title', 'closable'],
    template: '<section class="n-drawer-content-stub"><slot /></section>',
  }),
  NInput: defineComponent({
    props: ['value', 'placeholder', 'size', 'clearable'],
    emits: ['update:value'],
    template: '<input class="n-input-stub" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
  }),
  NSwitch: defineComponent({
    props: ['value'],
    emits: ['update:value'],
    template: '<button class="n-switch-stub" type="button" @click="$emit(\'update:value\', !value)"></button>',
  }),
  useMessage: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
  useDialog: () => ({
    warning: vi.fn(),
  }),
}))

import SkillsView from '@/views/hermes/SkillsView.vue'

describe('SkillsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfilesStore.activeProfileName = 'default'
    mockProfilesStore.profiles = [{ name: 'default' }]
    mockFetchPendingWrites.mockResolvedValue({ supported: true, records: [] })
    mockFetchSkillContent.mockResolvedValue({ content: '# first-skill\n\nFirst skill content' })
    vi.stubGlobal('fetch', vi.fn())
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  it('defaults to the first skill instead of loading recommendations', async () => {
    mockFetchSkills.mockResolvedValue({
      categories: [
        {
          name: 'alpha',
          description: '',
          skills: [
            { name: 'first-skill', description: 'First skill' },
            { name: 'second-skill', description: 'Second skill' },
          ],
        },
        {
          name: 'beta',
          description: '',
          skills: [{ name: 'third-skill', description: 'Third skill' }],
        },
      ],
      archived: [],
    })

    const wrapper = mount(SkillsView, {
      global: {
        stubs: {
          SkillList: defineComponent({
            props: ['categories', 'selectedSkill'],
            emits: ['select', 'deleted'],
            template: '<aside class="skill-list-stub" :data-selected="selectedSkill"></aside>',
          }),
          SkillDetail: defineComponent({
            props: ['category', 'skill', 'skillName'],
            template: '<article class="skill-detail-stub" :data-category="category" :data-skill="skill">{{ skillName }}</article>',
          }),
          SkillImportModal: true,
          SkillExternalDirsModal: true,
          PendingWriteApprovals: true,
        },
      },
    })

    await flushPromises()

    const detail = wrapper.get('.skill-detail')
    expect(detail.get('.detail-category').text()).toBe('alpha')
    expect(detail.get('.detail-name').text()).toBe('first-skill')
    expect(wrapper.text()).toContain('first-skill')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
