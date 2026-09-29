export type Feedstock = {
  gas: number;
  rock: number;
  sulphur: number;
};

export type CostLine = {
  label: string;
  value: string;
  total?: boolean;
};

export type ProductCost = {
  id: string;
  name: string;
  color: string;
  scale: number;
  cost: number;
  lines: CostLine[];
};

function money(value: number) {
  return `USD ${Math.round(value)}`;
}

export function ammoniaCost(gas: number) {
  return 33 * gas + 30;
}

export function sulphuricCost(sulphur: number) {
  return 0.33 * sulphur + 30;
}

export function productCosts({ gas, rock, sulphur }: Feedstock): ProductCost[] {
  const ammonia = ammoniaCost(gas);
  const acid = sulphuricCost(sulphur);
  const nitric = 0.29 * ammonia + 30;

  return [
    {
      id: "nh3prod",
      name: "NH3 (production cost)",
      color: "#1a4a6e",
      scale: 400,
      cost: Math.round(ammonia),
      lines: [
        { label: `Gas feedstock (33 MMBtu/t × USD ${gas.toFixed(1)})`, value: money(33 * gas) },
        { label: "Fixed production cost", value: "USD 30" },
        { label: "Total NH3 production cost", value: `${money(ammonia)}/t`, total: true },
      ],
    },
    {
      id: "urea",
      name: "Urea (46% N)",
      color: "#6baa8e",
      scale: 600,
      cost: Math.round(0.58 * ammonia + 100),
      lines: [
        { label: `NH3 (0.58t/t × USD ${Math.round(ammonia)})`, value: money(0.58 * ammonia) },
        { label: "CO₂ (byproduct — no cost)", value: "USD 0" },
        { label: "Fixed/variable costs", value: "USD 100" },
        { label: "Total cost", value: `${money(0.58 * ammonia + 100)}/t`, total: true },
      ],
    },
    {
      id: "hno3",
      name: "Nitric Acid (100%)",
      color: "#d97706",
      scale: 300,
      cost: Math.round(nitric),
      lines: [
        { label: `NH3 (0.29t/t × USD ${Math.round(ammonia)})`, value: money(0.29 * ammonia) },
        { label: "Fixed production cost", value: "USD 30" },
        { label: "Total cost", value: `${money(nitric)}/t`, total: true },
      ],
    },
    {
      id: "an",
      name: "AN (34% N)",
      color: "#b45309",
      scale: 500,
      cost: Math.round(0.436 * ammonia + 0.78 * nitric + 30),
      lines: [
        { label: `NH3 direct (0.436t/t × USD ${Math.round(ammonia)})`, value: money(0.436 * ammonia) },
        { label: `HNO3 via NH3 (0.78t/t × USD ${Math.round(nitric)})`, value: money(0.78 * nitric) },
        { label: "Fixed cost", value: "USD 30" },
        { label: "Total cost", value: `${money(0.436 * ammonia + 0.78 * nitric + 30)}/t`, total: true },
      ],
    },
    {
      id: "amsul",
      name: "Ammonium Sulphate",
      color: "#559278",
      scale: 400,
      cost: Math.round(0.26 * ammonia + 0.75 * acid + 30),
      lines: [
        { label: `NH3 (0.26t/t × USD ${Math.round(ammonia)})`, value: money(0.26 * ammonia) },
        { label: `H₂SO₄ (0.75t/t × USD ${Math.round(acid)})`, value: money(0.75 * acid) },
        { label: "Fixed cost", value: "USD 30" },
        { label: "Total cost", value: `${money(0.26 * ammonia + 0.75 * acid + 30)}/t`, total: true },
      ],
    },
    {
      id: "h2so4",
      name: "Sulphuric Acid",
      color: "#2d6060",
      scale: 300,
      cost: Math.round(acid),
      lines: [
        { label: `Sulphur (0.33t/t × USD ${Math.round(sulphur)})`, value: money(0.33 * sulphur) },
        { label: "Fixed production cost", value: "USD 30" },
        { label: "Total cost", value: `${money(acid)}/t`, total: true },
        { label: "Process: S → SO₂ → SO₃ → H₂SO₄", value: "" },
      ],
    },
    {
      id: "phos",
      name: "Phosphoric Acid (wet)",
      color: "#1d7a5c",
      scale: 2000,
      cost: Math.round(3.6 * rock + 2.8 * acid + 30),
      lines: [
        { label: `Phosphate rock (3.6t/t × USD ${Math.round(rock)})`, value: money(3.6 * rock) },
        { label: `H₂SO₄ (2.8t/t × USD ${Math.round(acid)})`, value: money(2.8 * acid) },
        { label: "Fixed cost", value: "USD 30" },
        { label: "Total cost", value: `${money(3.6 * rock + 2.8 * acid + 30)}/t`, total: true },
      ],
    },
    {
      id: "ssp",
      name: "SSP (20% P₂O₅)",
      color: "#4d7a0f",
      scale: 400,
      cost: Math.round(0.71 * rock + 0.21 * sulphur + 30),
      lines: [
        { label: `Phosphate rock (0.71t/t × USD ${Math.round(rock)})`, value: money(0.71 * rock) },
        { label: `Sulphur (0.21t/t × USD ${Math.round(sulphur)})`, value: money(0.21 * sulphur) },
        { label: "Fixed cost", value: "USD 30" },
        { label: "Total cost", value: `${money(0.71 * rock + 0.21 * sulphur + 30)}/t`, total: true },
      ],
    },
    {
      id: "tsp",
      name: "TSP (46% P₂O₅)",
      color: "#559913",
      scale: 800,
      cost: Math.round(1.44 * rock + 0.47 * sulphur + 30),
      lines: [
        { label: `Phosphate rock (1.44t/t × USD ${Math.round(rock)})`, value: money(1.44 * rock) },
        { label: `Sulphur (0.47t/t × USD ${Math.round(sulphur)})`, value: money(0.47 * sulphur) },
        { label: "Fixed cost", value: "USD 30" },
        { label: "Total cost", value: `${money(1.44 * rock + 0.47 * sulphur + 30)}/t`, total: true },
      ],
    },
    {
      id: "map",
      name: "MAP (11-52-0)",
      color: "#6baa8e",
      scale: 900,
      cost: Math.round(0.145 * ammonia + 1.91 * rock + 0.475 * sulphur + 30),
      lines: [
        { label: `NH3 (0.145t/t × USD ${Math.round(ammonia)})`, value: money(0.145 * ammonia) },
        { label: `Phosphate rock (1.91t/t × USD ${Math.round(rock)})`, value: money(1.91 * rock) },
        { label: `Sulphur (0.475t/t × USD ${Math.round(sulphur)})`, value: money(0.475 * sulphur) },
        { label: "Fixed cost", value: "USD 30" },
        { label: "Total cost", value: `${money(0.145 * ammonia + 1.91 * rock + 0.475 * sulphur + 30)}/t`, total: true },
      ],
    },
    {
      id: "dap",
      name: "DAP (18-46-0)",
      color: "#1a3a5c",
      scale: 900,
      cost: Math.round(0.219 * ammonia + 1.72 * rock + 0.427 * sulphur + 30),
      lines: [
        { label: `NH3 (0.219t/t × USD ${Math.round(ammonia)})`, value: money(0.219 * ammonia) },
        { label: `Phosphate rock (1.72t/t × USD ${Math.round(rock)})`, value: money(1.72 * rock) },
        { label: `Sulphur (0.427t/t × USD ${Math.round(sulphur)})`, value: money(0.427 * sulphur) },
        { label: "Fixed cost", value: "USD 30" },
        { label: "Total cost", value: `${money(0.219 * ammonia + 1.72 * rock + 0.427 * sulphur + 30)}/t`, total: true },
      ],
    },
  ];
}
