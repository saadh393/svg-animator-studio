import React from 'react'
import * as Accordion from '@radix-ui/react-accordion'

export default function LayersAccordion({ elements = [] }) {
  return (
    <Accordion.Root type="multiple" className="w-full">
      <Accordion.Item value="root" className="border border-gray-800 rounded-md">
        <Accordion.Header>
          <Accordion.Trigger className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800/70 rounded-md">Layers</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="px-2 pb-2">
          <ul className="space-y-1">
            {elements.map(el => (
              <li key={el.id}>
                <button
                  className="w-full text-left px-2 py-1 rounded hover:bg-gray-800 text-sm text-gray-300"
                  onClick={() => window.dispatchEvent(new CustomEvent('app:select', { detail: { id: el.id } }))}
                >
                  <span className="text-gray-400 mr-2">{el.tag}</span> #{el.id}
                </button>
              </li>
            ))}
          </ul>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  )
}

