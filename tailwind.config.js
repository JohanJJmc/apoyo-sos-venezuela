/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sos: {
          background: "#FAFAF7",
          surface: "#FFFFFF",
          ink: "#102A43",
          muted: "#62748A",
          primary: "#1E5BFF",
          primarySoft: "#EAF1FF",
          orange: "#F27405",
          coral: "#FF4545",
          pending: "#D92D20",
          pendingSoft: "#FDECEC",
          partial: "#E6A700",
          partialSoft: "#FFF6D8",
          resolved: "#168A4A",
          resolvedSoft: "#EAF7EF",
          border: "#D9E2EC",
        },
      },
      borderRadius: {
        input: "14px",
        card: "20px",
        sheet: "24px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 10px 28px rgba(16, 42, 67, 0.12)",
        floating: "0 14px 34px rgba(30, 91, 255, 0.28)",
        sheet: "0 -14px 36px rgba(16, 42, 67, 0.14)",
        marker: "0 8px 20px rgba(16, 42, 67, 0.22)",
        modal: "0 18px 40px rgba(16, 42, 67, 0.22)",
      },
      fontFamily: {
        sans: [
          "Nunito Sans",
          "Nunito",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
