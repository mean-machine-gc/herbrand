# Graph Analysis — Capabilities & Roadmap

Pipeline: `spec-lint → system-lint → build graph → graph-lint → graph-analysis`

Graph analysis operates on a **valid, linted graph**. These are not defects —
they are insights that inform architectural decisions, boundary refinement,
and system understanding.

## Implemented analyses (in graph-analysis-map.ts → graph-analysis.ts)

### Boundaries

| Analysis | Graphology approach | Output |
|----------|-------------------|--------|
| `analysis/cross-context-integration-points` | Filter edges where source/target contexts differ. Edge betweenness centrality to rank importance | List of boundary-crossing edges ranked by structural importance |
| `analysis/execution-context-cohesion` | Per context: internal edges vs cross-boundary edges. Modularity score using authored contexts as communities | Per-context cohesion ratio + system-wide modularity score |
| `analysis/execution-context-isolation` | Contexts with zero cross-boundary edges | List of isolated contexts |

### Coupling

| Analysis | Graphology approach | Output |
|----------|-------------------|--------|
| `analysis/cross-context-data-coupling` | Filter `updates` edges where outcome's operation context differs from view's decision context | List of cross-context state dependencies with affected info points |

### Impact

| Analysis | Graphology approach | Output |
|----------|-------------------|--------|
| `analysis/high-impact-signals` | Out-degree on triggers edges + betweenness centrality on signal nodes | Ranked list of signals by fan-out and bridging importance |
| `analysis/contention-hotspots` | In-degree on view nodes counting `updates` edges | Ranked list of views by update pressure |
| `analysis/bottleneck-detection` | Betweenness centrality on decision nodes | Decisions that all paths flow through — single points of failure |
| `analysis/blast-radius` | BFS from any node, count reachable nodes | Per-decision risk assessment: "if this breaks, how much is affected?" |

### Clustering

| Analysis | Graphology approach | Output |
|----------|-------------------|--------|
| `analysis/info-point-clustering` | Bipartite graph (decisions ↔ info points), project onto info-point side, Louvain on projection | Clusters of info points that co-occur → suggested aggregates |
| `analysis/decision-clustering` | Louvain community detection on the full decision graph | Discovered communities vs authored contexts → boundary alignment report |

### Flow

| Analysis | Graphology approach | Output |
|----------|-------------------|--------|
| `analysis/critical-path` | Shortest/longest path between external signals and terminal outcomes | Fast paths vs complex workflows — prioritization guidance |
| `analysis/dependency-depth` | Longest path in the chain subgraph (DAG) | How deep the reactive cascade goes — complexity metric |
| `analysis/temporal-ordering` | Topological sort of chain subgraph | Natural implementation order — build leaves first |
| `analysis/strongly-connected-components` | `stronglyConnectedComponents` on chain subgraph | All feedback loops in the system enumerated |

## Future possibilities (not yet in map)

| Analysis | Graphology approach | What it tells the analyst |
|----------|-------------------|--------------------------|
| **Actor workload balance** | Group nodes by actor, sum degree centrality per group | Which actors are overloaded vs underutilized |
| **Context complexity ranking** | Subgraph per context: count nodes, edges, compute density | Which contexts are most complex — prioritize for decomposition |
| **Signal taxonomy** | Classify signals by position: entry, bridge, terminal | Automatic event catalog categorization |
| **Redundancy detection** | Pairs of decisions with identical activatedBy + similar views | Potential duplicate business logic |
| **View similarity** | Jaccard similarity on view info point sets | Views that overlap → merge candidates or shared read models |
| **Cascading failure paths** | All simple paths from operation failure outcomes | "If this fails, what cascade follows?" |
| **Bounded context suggestion** | Louvain vs authored contexts, modularity delta | "Move decision Y from context A to B for X% better modularity" |
| **PageRank on decisions** | PageRank on trigger/emit edges | Which decisions are structurally most important |
