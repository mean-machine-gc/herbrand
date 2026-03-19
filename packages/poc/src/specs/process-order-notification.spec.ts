type ProcessOrderNotification = MachineOutcomeDecision<
    'notify_order_confirmed',
    'notification_failed',
    'customer_email_sent' | 'order_audit_logged'
>

const processOrderNotification: OutcomeDecisionSpec<ProcessOrderNotification, Contexts, Modules, Aggregates> = {
    type: 'outcome',
    agent: { kind: 'machine' },
    context: 'ordering',
    module: 'order_management',
    aggregate: 'order-processing',
    description: 'The system sends a confirmation email to the customer and logs the order event for audit',
    trigger: 'notify_order_confirmed',
    shouldFailWith: {
        notification_failed: {
            description: 'The notification could not be sent due to a system error',
            requiredInfo: ['customer_email'],
            scenarios: [
                { description: 'Email service is down' },
                { description: 'Customer email address is invalid' }
            ]
        }
    },
    shouldSucceedWith: {
        customer_email_sent: {
            condition: 'always',
            description: 'A confirmation email is sent to the customer',
            requiredInfo: ['customer_email', 'order_status'],
            scenarios: [
                { description: 'Customer receives order confirmation with tracking details' }
            ]
        },
        order_audit_logged: {
            condition: 'always',
            description: 'The order confirmation is logged for audit purposes',
            requiredInfo: ['order_status'],
            scenarios: [
                { description: 'Audit system records the confirmation timestamp and order details' }
            ]
        }
    },
    shouldAssert: {
        customer_email_sent: [
            {
                tag: 'confirmation_email_delivered',
                description: 'The confirmation email has been sent to the customer',
                affectedInfo: ['customer_email']
            }
        ],
        order_audit_logged: [
            {
                tag: 'audit_entry_created',
                description: 'An audit log entry is created for the order confirmation',
                affectedInfo: ['audit_log']
            }
        ]
    }
}
