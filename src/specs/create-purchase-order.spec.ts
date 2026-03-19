type CreatePurchaseOrder = HumanIntentDecision<
    'purchase_order_created',
    'supplier_selected' | 'budget_available',
    'create_purchase_order'
>

const createPurchaseOrder: IntentDecisionSpec<CreatePurchaseOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'procurement_officer' },
    context: 'procurement',
    module: 'purchasing',
    aggregate: 'procurement-processing',
    businessGoal: 'acquire necessary materials from approved suppliers within budget',
    description: 'A procurement officer creates a purchase order to request goods from a supplier',
    trigger: { type: 'success', outcome: 'purchase_order_created' },
    preconditions: {
        supplier_selected: {
            description: 'A valid and active supplier has been selected',
            requiredInfo: ['supplier_status'],
            scenarios: [
                { description: 'Officer tries to create a PO without selecting a supplier' }
            ]
        },
        budget_available: {
            description: 'The department budget can accommodate the purchase order total',
            requiredInfo: ['department_budget'],
            scenarios: [
                { description: 'Officer requests materials that would push the quarterly budget over limit' }
            ]
        }
    },
    producesIntent: {
        intent: 'create_purchase_order',
        condition: 'Supplier is valid and budget is available',
        description: 'A new purchase order is created in pending approval state',
        requiredInfo: ['supplier_status', 'department_budget'],
    },
}
