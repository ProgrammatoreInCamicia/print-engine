import { ReactElement, ReactNode } from "react"
import { exampleDoc } from "../data/exampleDoc"
import { DesignerProvider } from "../state/DesignerContext"
import { render, RenderOptions } from "@testing-library/react"

const AllTheProviders = ({children}: {children: ReactNode}) => {
    return (
        <DesignerProvider initialDoc={exampleDoc}>
            {children}
        </DesignerProvider>
    )
}

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }