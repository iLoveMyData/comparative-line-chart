// Power Query M — Sales vs Budget test data (2024-2025)
// Copy the whole file and paste it into Power BI Desktop:
//   Home → Transform data → New Source → Blank Query → Advanced editor
// Then Close & Apply. No external CSV needed.

let
    Source = #table(
        type table [Date = date, Actual = Int64.Type, Budget = Int64.Type],
        {
            // 2024 — Q2 strong, Q3 supply-chain dip, Q4 holiday surge
            { #date(2024,  1, 1),  48000, 50000 },
            { #date(2024,  2, 1),  52000, 51000 },
            { #date(2024,  3, 1),  55000, 52000 },
            { #date(2024,  4, 1),  58000, 54000 },
            { #date(2024,  5, 1),  62000, 56000 },
            { #date(2024,  6, 1),  65000, 58000 },
            { #date(2024,  7, 1),  42000, 60000 },   // supply-chain hit
            { #date(2024,  8, 1),  55000, 62000 },
            { #date(2024,  9, 1),  60000, 63000 },
            { #date(2024, 10, 1),  72000, 65000 },
            { #date(2024, 11, 1),  85000, 68000 },   // Black Friday
            { #date(2024, 12, 1),  95000, 72000 },   // Holiday peak
            // 2025 — post-holiday dip, then progressive outperformance
            { #date(2025,  1, 1),  58000, 65000 },
            { #date(2025,  2, 1),  60000, 66000 },
            { #date(2025,  3, 1),  67000, 68000 },
            { #date(2025,  4, 1),  71000, 70000 },
            { #date(2025,  5, 1),  74000, 72000 },
            { #date(2025,  6, 1),  78000, 74000 },
            { #date(2025,  7, 1),  82000, 76000 },
            { #date(2025,  8, 1),  86000, 78000 },
            { #date(2025,  9, 1),  90000, 80000 },
            { #date(2025, 10, 1),  94000, 82000 },
            { #date(2025, 11, 1), 102000, 85000 },
            { #date(2025, 12, 1), 115000, 90000 }
        }
    ),
    #"Renamed" = Table.RenameColumns(Source, {{"Date", "Month"}})
in
    #"Renamed"
