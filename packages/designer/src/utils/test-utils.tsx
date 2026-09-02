import { ReactElement, ReactNode } from "react"
import { PrintDocument } from "@print-engine/schema"
import { exampleDoc } from "../data/exampleDoc"
import { DesignerProvider } from "../state/DesignerContext"
import { render, RenderOptions } from "@testing-library/react"

interface DesignerRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    /** The document the provider starts from. Defaults to exampleDoc. */
    initialDoc?: PrintDocument;
}

const customRender = (
    ui: ReactElement,
    { initialDoc = exampleDoc, ...options }: DesignerRenderOptions = {},
) => render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
        <DesignerProvider initialDoc={initialDoc}>
            {children}
        </DesignerProvider>
    ),
    ...options,
})

export * from '@testing-library/react'
export { customRender as render }
