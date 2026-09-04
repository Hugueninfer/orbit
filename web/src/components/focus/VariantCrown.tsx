import { treeVariant } from "./treeVariants";
// Explicit silhouette recipes keep each numbered tree recognizable at garden-card size.
const crowns = [
  [
    [111, 116, 39, 39],
    [152, 82, 44, 39],
    [191, 117, 37, 40],
    [151, 137, 43, 33],
  ],
  [
    [146, 63, 25, 30],
    [132, 103, 28, 36],
    [165, 109, 27, 39],
    [149, 148, 29, 28],
  ],
  [
    [92, 113, 24, 42],
    [120, 89, 27, 42],
    [154, 78, 28, 46],
    [187, 94, 27, 44],
    [211, 122, 21, 34],
  ],
  [
    [102, 94, 32, 30],
    [178, 66, 29, 29],
    [197, 129, 32, 31],
    [141, 121, 40, 37],
    [113, 150, 26, 22],
  ],
  [
    [108, 123, 25, 58],
    [148, 91, 45, 36],
    [192, 125, 25, 60],
    [154, 129, 40, 43],
  ],
  [
    [113, 88, 36, 35],
    [178, 88, 36, 35],
    [128, 126, 34, 32],
    [165, 126, 34, 32],
    [149, 152, 26, 22],
  ],
  [
    [147, 60, 26, 23],
    [148, 93, 45, 26],
    [149, 132, 66, 32],
    [149, 162, 45, 17],
  ],
  [
    [95, 135, 34, 34],
    [123, 100, 31, 35],
    [167, 81, 43, 36],
    [201, 106, 34, 30],
    [163, 126, 40, 32],
  ],
  [
    [91, 106, 29, 26],
    [126, 84, 39, 34],
    [169, 84, 39, 34],
    [207, 106, 29, 26],
    [151, 115, 68, 24],
  ],
  [
    [113, 94, 30, 42],
    [178, 85, 33, 49],
    [117, 139, 28, 32],
    [175, 139, 30, 37],
    [149, 145, 32, 20],
  ],
];
export function VariantCrown({ variantId }: { variantId: number }) {
  const v = treeVariant(variantId);
  return (
    <g data-tree-variant={variantId}>
      <path
        d="M149 160l-31-38M155 152l28-38"
        stroke={v.trunk}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {v.species === "pine" ? (
        <g>
          {Array.from({ length: 3 + (v.shape % 4) }, (_, i) => {
            const count = 3 + (v.shape % 4);
            const top = 45 + i * (110 / count);
            const width = 24 + i * (48 / count) + (v.shape % 3) * 6;
            const bottom = top + 48 + (v.shape % 2) * 8;
            return (
              <g key={i}>
                <path
                  d={`M150 ${top} Q${150 - width * 0.6} ${bottom - 12} ${150 - width} ${bottom} Q150 ${bottom + 18} ${150 + width} ${bottom} Q${150 + width * 0.6} ${bottom - 12} 150 ${top}`}
                  fill={v.colors[i % 2 ? 1 : 2]}
                />
                <path
                  d={`M150 ${top} Q${150 - width * 0.6} ${bottom - 12} ${150 - width} ${bottom} Q${140} ${bottom + 8} 151 ${bottom + 6}Z`}
                  fill={v.colors[0]}
                  opacity=".6"
                />
                {v.shape > 6 && (
                  <path
                    d={`M150 ${top}l-10 20 10-5 12 5Z`}
                    fill="#ebf3e9"
                    opacity=".85"
                  />
                )}
              </g>
            );
          })}
        </g>
      ) : (
        <g>
          {crowns[v.shape].map(([x, y, rx, ry], i) => (
            <g key={i}>
              <ellipse
                cx={x + 2}
                cy={y + 6}
                rx={rx}
                ry={ry}
                fill={v.colors[2]}
              />
              <ellipse
                cx={x}
                cy={y}
                rx={rx}
                ry={ry * 0.9}
                fill={v.colors[i % 3 === 0 ? 0 : 1]}
              />
              <path
                d={`M${x - rx * 0.5} ${y - ry * 0.25}q${rx * 0.1} ${-ry * 0.4} ${rx * 0.5} ${-ry * 0.35}`}
                fill="none"
                stroke={v.colors[0]}
                strokeWidth="5"
                strokeLinecap="round"
                opacity=".65"
              />
              {(v.species === "sakura" || v.shape % 3 === 0) && (
                <g fill={v.accent}>
                  <circle cx={x + 9} cy={y - 4} r="3" />
                  <circle cx={x - 8} cy={y + 8} r="2.5" />
                  {v.species === "sakura" && (
                    <>
                      <circle cx={x + 6} cy={y - 7} r="3" />
                      <circle cx={x + 12} cy={y - 7} r="3" />
                    </>
                  )}
                </g>
              )}
            </g>
          ))}
        </g>
      )}
    </g>
  );
}
