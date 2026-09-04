import { useId } from "react";
export const speciesNames = {
  oak: "Carvalho",
  pine: "Pinheiro",
  sakura: "Cerejeira",
} as const;
export type Species = keyof typeof speciesNames;
export function Tree({
  species = "oak",
  stage = 3,
  island = true,
  animated = false,
}: {
  species?: Species;
  stage?: number;
  island?: boolean;
  animated?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const pink = species === "sakura";
  const colors = pink
    ? ["#f7b9d5", "#dc7eae", "#b7568e"]
    : ["#83e3ac", "#42b990", "#238878"];
  return (
    <svg
      viewBox="0 0 300 280"
      className={`focus-tree ${animated ? "growing" : ""}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}soil`} x2="0" y2="1">
          <stop stopColor="#344d47" />
          <stop offset="1" stopColor="#1b302f" />
        </linearGradient>
        <linearGradient id={`${id}leaf`} x2=".8" y2="1">
          <stop stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[2]} />
        </linearGradient>
      </defs>
      {island && (
        <g>
          <ellipse
            cx="150"
            cy="253"
            rx="82"
            ry="12"
            fill="#050e1c"
            opacity=".35"
          />
          <path
            d="M47 206 74 232 132 248 176 251 232 230 253 206Z"
            fill={`url(#${id}soil)`}
          />
          <ellipse cx="150" cy="204" rx="103" ry="35" fill="#315d4d" />
          <ellipse cx="150" cy="199" rx="100" ry="30" fill="#59856a" />
          <path d="M57 205Q137 235 244 201Q180 245 80 221Z" fill="#416b55" />
          {[65, 90, 205, 224].map((x, i) => (
            <g key={x} transform={`translate(${x} ${199 + (i % 2) * 9})`}>
              <path
                d="M0 0l-3-8M0 0l4-6"
                stroke="#9fc294"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {i % 2 === 0 && <circle cx="3" cy="-8" r="2.5" fill="#f1d595" />}
            </g>
          ))}
          <ellipse cx="115" cy="215" rx="6" ry="3" fill="#94a392" />
          <ellipse cx="222" cy="193" rx="7" ry="4" fill="#9db0a1" />
        </g>
      )}
      <ellipse
        cx="150"
        cy="205"
        rx={stage === 0 ? 14 : 38}
        ry="8"
        fill="#244e40"
        opacity=".35"
      />
      <g className="tree-crown" style={{ transformOrigin: "150px 205px" }}>
        {stage === 0 ? (
          <>
            <ellipse cx="150" cy="203" rx="12" ry="6" fill="#ba9970" />
            <path d="M149 203l4-6" stroke="#6a4a33" strokeWidth="2" />
            <path d="M155 198q12-15 18-3q-8 9-18 3" fill={colors[0]} />
          </>
        ) : stage === 1 ? (
          <>
            <path
              d="M150 205q-5-30 3-47"
              stroke="#83a777"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path d="M151 179q-32 0-30-22q24-3 30 22" fill={colors[1]} />
            <path d="M151 166q29 0 31-23q-27-4-31 23" fill={colors[0]} />
          </>
        ) : (
          <g
            transform={stage === 2 ? "translate(45 61.5) scale(.7)" : undefined}
          >
            <path d="M140 209l5-105 13 0 5 105q-11 7-23 0" fill="#ae8263" />
            <path d="M149 202l5-94 4 0 5 101" fill="#785943" />
            <path
              d="M149 159l-30-33M155 151l29-37"
              stroke="#957053"
              strokeWidth="7"
              strokeLinecap="round"
            />
            {species === "pine" ? (
              <>
                <path
                  d="M150 46l-43 65h20l-36 47h25l-37 35q74 26 143 0l-40-35h26l-39-47h23Z"
                  fill={`url(#${id}leaf)`}
                />
                <path
                  d="M150 47l5 68 39-4-28 10 41 37-43 5 57 30q-38 8-66 6Z"
                  fill="#267d70"
                  opacity=".4"
                />
              </>
            ) : (
              <>
                <path
                  d="M103 155C57 151 63 92 100 89C98 49 146 37 173 63C218 50 243 100 214 124C230 165 175 182 155 163C137 177 109 172 103 155Z"
                  fill={colors[2]}
                />
                <circle cx="109" cy="110" r="39" fill={colors[1]} />
                <circle cx="155" cy="91" r="44" fill={`url(#${id}leaf)`} />
                <circle cx="188" cy="118" r="36" fill={colors[1]} />
                <circle cx="145" cy="131" r="35" fill={colors[1]} />
                <path
                  d="M122 75q20-20 41-7M84 103q3-12 14-15"
                  stroke={colors[0]}
                  opacity=".75"
                  strokeWidth="7"
                  fill="none"
                  strokeLinecap="round"
                />
                {pink &&
                  [
                    [112, 94],
                    [172, 78],
                    [194, 124],
                    [136, 146],
                    [153, 112],
                  ].map(([x, y]) => (
                    <g key={x} fill="#ffe5ef">
                      <circle cx={x} cy={y} r="4" />
                      <circle cx={x + 4} cy={y + 4} r="3" />
                      <circle cx={x - 3} cy={y + 4} r="3" />
                    </g>
                  ))}
              </>
            )}
          </g>
        )}
      </g>
    </svg>
  );
}
