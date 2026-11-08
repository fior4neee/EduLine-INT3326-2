# Charts (Recharts)

[Recharts](https://recharts.org) draws charts from React components. **Version:** 3.10 · **Status:** installed, not used yet.

It is meant for the **instructor dashboard** (Week 7) and student progress views. That data comes from M3's analytics and progress modules.

| Planned view | Chart |
|---|---|
| Enrollments in a course over time | `LineChart` |
| Quiz score distribution | `BarChart` |
| Lesson completion rate per module | horizontal `BarChart` |
| A student's progress in a course | Not a chart: use the shadcn `progress` bar ([ui-components.md](ui-components.md)) |

## Basic usage

```tsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

<ResponsiveContainer width="100%" height={280}>
  <LineChart data={rows}>
    <XAxis dataKey="date" />
    <YAxis allowDecimals={false} />
    <Tooltip />
    <Line type="monotone" dataKey="enrollments" stroke="#2563eb" dot={false} />
  </LineChart>
</ResponsiveContainer>
```

- Always wrap a chart in `ResponsiveContainer` and give it a fixed `height`. Otherwise it renders at 0 px.
- Fetch the rows with TanStack Query ([data-fetching.md](data-fetching.md#tanstack-query)) and pass them in as `data`.
- Recharts is one of the largest dependencies in the project. Load dashboard pages with `React.lazy` so students who never open them don't download it.
