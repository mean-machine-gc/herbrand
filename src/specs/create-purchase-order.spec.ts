type CreatePurchaseOrder = HumanIntentDecision<
    'purchase_order_created',
    'missing_supplier' | 'budget_exceeded',
    'create_purchase_order'
>

const createPurchaseOrder: DecisionSpec<CreatePurchaseOrder, Contexts, Modules, Aggregates> = {
    type: 'intent',
    agent: { kind: 'human', role: 'procurement_officer' },
    context: 'procurement',
    module: 'purchasing',
    aggregate: 'procurement-processing',
    description: 'A procurement officer creates a purchase order to request goods from a supplier',
    trigger: 'purchase_order_created',
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
    shouldAssert: {
        create_purchase_order: [
            {
                tag: 'purchase_order_pending_approval',
                description: 'The purchase order is persisted with status pending approval',
                affectedInfo: ['purchase_order_status']
            },
            {
                tag: 'budget_reserved',
                description: 'The requested amount is reserved against the department budget',
                affectedInfo: ['budget_reservation', 'department_budget']
            },
            {
                tag: 'purchase_order_linked_to_supplier',
                description: 'The purchase order references the selected supplier',
                affectedInfo: ['purchase_order_supplier_reference']
            }
        ]
    }
}
