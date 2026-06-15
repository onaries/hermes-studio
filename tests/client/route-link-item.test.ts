// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import RouteLinkItem from '@/components/common/RouteLinkItem.vue'

describe('RouteLinkItem', () => {
  it('renders a real anchor with href from RouterLink custom slot', () => {
    const wrapper = mount(RouteLinkItem, {
      props: {
        to: { name: 'hermes.session', params: { id: 's1' } },
        active: true,
      },
      slots: {
        default: 'Session S1',
      },
      global: {
        components: {
          RouterLink: defineComponent({
            props: ['to', 'custom'],
            template: '<slot href="/session/s1" :navigate="() => {}" :is-active="true" :is-exact-active="true" />',
          }),
        },
      },
    })

    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('/session/s1')
    expect(link.classes()).toContain('route-link-item')
    expect(link.classes()).toContain('active')
    expect(link.attributes('aria-current')).toBe('page')
    expect(link.text()).toContain('Session S1')
  })

  it('explicitly invokes RouterLink navigate on click', async () => {
    const navigate = vi.fn((event?: MouseEvent) => event?.preventDefault())
    const wrapper = mount(RouteLinkItem, {
      props: {
        to: { name: 'hermes.settings' },
      },
      slots: {
        default: 'Settings',
      },
      global: {
        components: {
          RouterLink: defineComponent({
            props: ['to', 'custom'],
            setup(_, { slots }) {
              return () => slots.default?.({
                href: '#/hermes/settings',
                navigate,
                isActive: false,
                isExactActive: false,
              })
            },
          }),
        },
      },
    })

    await wrapper.get('a').trigger('click')
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent)
  })
})
