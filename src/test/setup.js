import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Remove what each test rendered, so tests do not see each other's elements
afterEach(() => cleanup())
