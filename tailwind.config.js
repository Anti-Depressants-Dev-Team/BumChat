/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#000000',
                primary: '#8A2BE2',
                secondary: '#bf00ff',
            }
        },
    },
    plugins: [],
}
