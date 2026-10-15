# **App Name**: OrderFlow

## Core Features:

- Landing Page with Hero & Insight Cards: Build a comprehensive landing page (route: /) featuring a hero section with headline and subheadline, primary 'Connect Wallet' and secondary 'View Demo' call-to-action buttons, and three static 'Insight Preview Cards' showcasing example AI analysis output. Includes a sticky top navigation bar.
- Wallet Connection & State Management: Implement a 'Connect Wallet' modal offering 'Keplr Wallet' and 'MetaMask' options. Upon selection, store a hardcoded fake wallet address in React state and navigate to the /dashboard route, displaying a 'Wallet connected successfully' toast notification.
- Mock Trading Data Generation: Generate a 'src/lib/mock-data.ts' file exporting MOCK_TRADES (200 trade objects with specific behavioral patterns) and MOCK_ANALYSIS (a string containing a pre-written, structured AI analysis across four sections). This data is used for demo mode and initial dashboard display.
- Interactive Trading Dashboard: The main application page (route: /dashboard) displays a full-width demo banner (in demo mode), a 5-card stats strip, and a two-column main area. The left column features a paginated trade history table with specific columns and styling. The right column initially shows an 'AI Trading Analysis' card with a pulsing 'Analyze My Trading' button and feature teasers.
- AI Behavioral Trading Coach Tool: An AI tool that analyzes a user's on-chain trading history to reveal specific behavioral patterns, identify 'blind spots' costing money, highlight 'hidden edges' of success, and suggest 'this week's focus' for improvement. This tool will reference specific numbers from trade data in its reasoning.
- Dynamic AI Analysis Panel: When 'Analyze My Trading' is clicked, a panel (right slide-in or modal) opens on the /dashboard page. It streams the AI analysis word-by-word with a typewriter effect, organized into four clearly labeled sections. After streaming, 'Save Report' and 'Share on X' buttons appear.
- Public Shareable Report Page: A standalone public page (route: /report/[id]) displaying a saved analysis report. It includes the truncated wallet address, analysis date, trade count, the full AI analysis text (non-streamed), the stats strip, and a large 'Analyze Your Own Trades' CTA. Incorporates proper Open Graph meta tags for social sharing.
- Demo Mode Activation & Display: Clicking 'View Demo' navigates to /dashboard, activates demo mode, displays an amber banner, loads MOCK_TRADES into the table, and allows the 'Analyze My Trading' button to trigger a simulated streaming of MOCK_ANALYSIS.
- Shared Navigation Component: A consistent navigation bar used across all pages, featuring the 'OrderFlow' logo on the left and dynamic elements on the right: 'Connect Wallet' button (if not connected), or truncated wallet address with 'Disconnect' button (if connected), plus a 'View Demo' text link.

## Style Guidelines:

- Overall Dark Theme: A deep, near-black background (#0A0A0F) provides a sophisticated and data-focused canvas for all pages.
- Primary Accent Color: Vibrant electric blue/cyan (#00D4FF) for CTAs, highlights, section headers, glowing effects, and the 'Flow' part of the logo.
- Secondary Accent Color: Deep purple (#6366F1) used for labels, secondary highlights, and the 'SAMPLE INSIGHT' label on landing page cards.
- Text Colors: Pure white (#FFFFFF) for primary text (headlines, values, main content) and muted grey (#8B8B9E) for secondary/subtle text (subheadlines, labels, prices).
- Component Backgrounds: Slightly lighter near-black (#13131A) for all cards, panels, and modal backgrounds.
- Status Badge Colors: BUY badges are filled green (#00D084), SELL badges are filled red (#FF4444). MARKET type badges are outlined amber (#FDC20B), and LIMIT type badges are outlined blue (#4C8BE6).
- P&L Display Colors: Positive P&L is green (#00D084), negative P&L is red (#FF4444). Null P&L (for spot non-closed positions) is an em dash '—' in muted gray.
- Demo Banner: Amber background (#FDC20B) with dark text for the full-width demo banner.
- Body Text Font: 'Inter' (sans-serif) for general body text, UI elements, and the 'Order' part of the logo, providing clear and modern readability.
- Monospace Font: 'Source Code Pro' (monospace sans-serif) for numbers, prices, wallet addresses, and dates in tables, enhancing precision and a 'Bloomberg Terminal' aesthetic.
- Section Headers: Text rendered from '##' markdown will be uppercase, color #00D4FF, font-size 0.75rem, letter-spacing 0.12em, font-weight 600, with specific top margin.
- Minimalist Icons: Use simple, clean line icons for wallet placeholders and other UI elements, primarily in white or the primary accent color, to maintain a professional, uncluttered look.
- Desktop-First Design: Layout optimized for desktop (minimum viewport 1024px), avoiding mobile-specific elements like hamburger menus, to ensure a clean, data-forward presentation.
- Structured & Data-Centric Layout: Emphasizes clear visual hierarchy with well-defined sections, ample spacing, and precise alignment. Data is displayed exclusively in tables and stat cards, with no charts or graphs.
- Panel & Modal Styling: Analysis panels (slide-in or modal) will have a dark background (#13131A) and a subtle border (1px solid rgba(0,212,255,0.15)) for visual separation without harsh lines.
- Stat Card Styling: All stat cards feature a border: 1px solid rgba(0,212,255,0.2) and a box-shadow: 0 2px 20px rgba(0,212,255,0.08) for a subtle glowing effect.
- Pulsing 'Analyze My Trading' Button: A continuous pulsing glow animation using keyframes, alternating box-shadow between `0 0 12px rgba(0,212,255,0.6)` and `0 0 28px rgba(0,212,255,0.95)` every 1.5s (ease-in-out infinite loop).
- Streaming AI Text Effect: The AI analysis will be revealed word-by-word with a typewriter effect (e.g., 18ms per character) within the dynamic analysis panel, creating an engaging user experience.
- Smooth UI Transitions: All interactive elements will utilize a `transition: all 0.2s ease` property for subtle and fluid visual changes, with hover states showing slightly brighter colors or increased glows.