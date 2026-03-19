export function HerbrandLogo({ size = 22 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontWeight: 900,
        fontSize: size,
        letterSpacing: "-0.15em",
        display: "inline-flex",
      }}
    >
      <span>H</span><span style={{ marginLeft: "-0.12em" }}>B</span>
    </span>
  );
}
