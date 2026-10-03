import { ReactElement, ReactNode } from "react"
import { PrintDocument } from "@print-engine/schema"
import { DesignerProvider } from "../state/DesignerContext"
import { render, RenderOptions } from "@testing-library/react"

interface DesignerRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    /** The document the provider starts from. Defaults to fixtureDoc. */
    initialDoc?: PrintDocument;
}

const customRender = (
    ui: ReactElement,
    { initialDoc = fixtureDoc, ...options }: DesignerRenderOptions = {},
) => render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
        <DesignerProvider initialDoc={initialDoc}>
            {children}
        </DesignerProvider>
    ),
    ...options,
})


export const fixtureDoc: PrintDocument = {
    schemaVersion: 1,
    page: { size: 'A4' },
    body: {
        type: 'stack',
        children: [
            { type: 'text', value: 'Title' },
            {
                type: 'group',
                dataSource: '$.items',
                groupBy: '$item.category',
                groupHeader: { type: 'field', bind: '$group.key' },
                detail: { type: 'text', value: 'row' },
                // groupFooter intentionally omitted, to exercise the empty-slot case
            },
        ],
    },
};

export * from '@testing-library/react'
export { customRender as render }
