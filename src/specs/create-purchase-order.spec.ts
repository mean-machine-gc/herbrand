type CreatePurchaseOrder = HumanIntentDecision<
    'purchase_order_created',
    'missing_supplier' | 'budget_exceeded',
    'create_purchase_order'
>

const createPurchaseOrder: IntentDecisionSpec<CreatePurchaseOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'procurement_officer' },
    context: 'procurement',
    module: 'purchasing',
    aggregate: 'procurement-processing',
    description: 'A procurement officer creates a purchase order to request goods from a supplier',
    trigger: { type: 'success', outcome: 'purchase_order_created' },
    shouldFailWith: {
        missing_supplier: {
            description: 'No supplier has been selected or the supplier is inactive',
            requiredInfo: ['supplier_status'],
            examples: [
                { description: 'Officer tries to create a PO without selecting a supplier' }
            ]
        },
        budget_exceeded: {
            description: 'The purchase order total exceeds the available budget for the department',
            requiredInfo: ['department_budget'],
            examples: [
                { description: 'Officer requests materials that would push the quarterly budget over limit' }
            ]
        }
    },
    shouldSucceedWith: {
        create_purchase_order: {
            condition: 'Supplier is valid and budget is available',
            description: 'A new purchase order is created in pending approval state',
            requiredInfo: ['supplier_status', 'department_budget'],
        }
    },
}
