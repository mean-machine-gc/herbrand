function extractMatch(content, pattern) {
    const m = content.match(pattern);
    return m ? m[1] : null;
}
function extractStringArray(content, pattern) {
    const m = content.match(pattern);
    if (!m)
        return [];
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
function parseRejectBlock(blockContent) {
    const details = {};
    for (const m of blockContent.matchAll(/^\s{8}(\w+):\s*\{([\s\S]*?)^\s{8}\}/gm)) {
        const key = m[1];
        const body = m[2];
        const description = extractMatch(body, /description:\s*'([^']+)'/);
        const requiredInfo = extractStringArray(body, /requiredInfo:\s*\[([^\]]*)\]/);
        const allDescriptions = [...body.matchAll(/\{\s*description:\s*'([^']+)'\s*\}/g)].map((x) => x[1]);
        const scenarios = allDescriptions.filter((e) => e !== description);
        details[key] = { description, requiredInfo, scenarios };
    }
    return details;
}
function parseSucceedBlock(blockContent) {
    const details = {};
    for (const m of blockContent.matchAll(/^\s{8}(\w+):\s*\{([\s\S]*?)^\s{8}\}/gm)) {
        const key = m[1];
        const body = m[2];
        const condition = extractMatch(body, /condition:\s*'([^']+)'/);
        const description = extractMatch(body, /description:\s*'([^']+)'/);
        const requiredInfo = extractStringArray(body, /requiredInfo:\s*\[([^\]]*)\]/);
        const allDescriptions = [...body.matchAll(/\{\s*description:\s*'([^']+)'\s*\}/g)].map((x) => x[1]);
        const scenarios = allDescriptions.filter((e) => e !== description && e !== condition);
        details[key] = { condition, description, requiredInfo, scenarios };
    }
    return details;
}
function parseAssertBlock(blockContent) {
    const details = {};
    const affectedInfoSet = new Set();
    for (const choiceMatch of blockContent.matchAll(/^\s{8}(\w+):\s*\[([\s\S]*?)\s{8}\]/gm)) {
        const choiceKey = choiceMatch[1];
        const arrayBody = choiceMatch[2];
        const assertions = [];
        for (const assertMatch of arrayBody.matchAll(/\{\s*tag:\s*'([^']+)',\s*description:\s*'([^']+)',\s*affectedInfo:\s*\[([^\]]*)\]\s*\}/g)) {
            const affInfos = [...assertMatch[3].matchAll(/'([^']+)'/g)].map((x) => x[1]);
            for (const i of affInfos)
                affectedInfoSet.add(i);
            assertions.push({
                tag: assertMatch[1],
                description: assertMatch[2],
                affectedInfo: affInfos,
            });
        }
        details[choiceKey] = assertions;
    }
    return { details, affectedInfo: [...affectedInfoSet] };
}
function parseSpecContent(content) {
    const isOutcome = /OutcomeDecisionSpec/.test(content);
    const isIntent = /IntentDecisionSpec/.test(content);
    // Trigger
    let trigger = "";
    let triggerType = "intent";
    if (isIntent) {
        const triggerMatch = content.match(/trigger:\s*\{\s*type:\s*'(success|reject)',\s*(?:outcome|rejection):\s*'([^']+)'/);
        if (triggerMatch) {
            triggerType = triggerMatch[1];
            trigger = triggerMatch[2];
        }
    }
    else {
        const triggerMatch = content.match(/trigger:\s*'([^']+)'/);
        if (triggerMatch) {
            trigger = triggerMatch[1];
            triggerType = "intent";
        }
    }
    // Rejects / preconditions
    const failBlock = content.match(/(?:preconditions|shouldFailWith):\s*\{([\s\S]*?)\n    \}/);
    const rejectDetails = failBlock ? parseRejectBlock(failBlock[1]) : {};
    const rejects = Object.keys(rejectDetails);
    // Choices
    let choiceDetails = {};
    let choices = [];
    if (isIntent) {
        const producesBlock = content.match(/producesIntent:\s*\{([\s\S]*?)\n    \}/);
        if (producesBlock) {
            const body = producesBlock[1];
            const intent = extractMatch(body, /intent:\s*'([^']+)'/) ?? "unknown";
            const description = extractMatch(body, /description:\s*'([^']+)'/);
            const requiredInfo = extractStringArray(body, /requiredInfo:\s*\[([^\]]*)\]/);
            const allDescriptions = [...body.matchAll(/\{\s*description:\s*'([^']+)'\s*\}/g)].map((x) => x[1]);
            const scenarios = allDescriptions.filter((e) => e !== description);
            choices = [intent];
            choiceDetails = {
                [intent]: { condition: null, description, requiredInfo, scenarios },
            };
        }
    }
    else {
        const succeedBlock = content.match(/shouldSucceedWith:\s*\{([\s\S]*?)\n    \}/);
        if (succeedBlock) {
            choiceDetails = parseSucceedBlock(succeedBlock[1]);
            choices = Object.keys(choiceDetails);
        }
    }
    // Assertions (outcome only)
    let assertionDetails = {};
    let affectedInfo = [];
    if (isOutcome) {
        const assertBlock = content.match(/shouldAssert:\s*\{([\s\S]*)\}\s*\}/);
        if (assertBlock) {
            const parsed = parseAssertBlock(assertBlock[1]);
            assertionDetails = parsed.details;
            affectedInfo = parsed.affectedInfo;
        }
    }
    // Aggregate requiredInfo
    const allReqInfo = new Set();
    for (const det of Object.values(rejectDetails)) {
        for (const i of det.requiredInfo)
            allReqInfo.add(i);
    }
    for (const det of Object.values(choiceDetails)) {
        for (const i of det.requiredInfo)
            allReqInfo.add(i);
    }
    // Rejects without scenarios
    const rejectsWithoutScenarios = rejects.filter((key) => rejectDetails[key].scenarios.length === 0);
    // Metadata
    const role = extractMatch(content, /role:\s*'([^']+)'/);
    const agentKind = extractMatch(content, /kind:\s*'([^']+)'/);
    const context = extractMatch(content, /context:\s*'([^']+)'/);
    const module = extractMatch(content, /module:\s*'([^']+)'/);
    const aggregate = extractMatch(content, /aggregate:\s*'([^']+)'/);
    const description = extractMatch(content, /description:\s*'([^']+)'/);
    const businessGoal = extractMatch(content, /businessGoal:\s*'([^']+)'/);
    return {
        type: isOutcome ? "outcome" : "intent",
        description: description ?? null,
        businessGoal: businessGoal ?? null,
        trigger,
        triggerType,
        choices,
        choiceDetails,
        rejects,
        rejectDetails,
        assertionDetails,
        requiredInfo: [...allReqInfo],
        affectedInfo,
        rejectsWithoutScenarios,
        role: role ?? agentKind ?? null,
        context: context ?? null,
        module: module ?? null,
        aggregate: aggregate ?? null,
    };
}
function parseInfoUnion(content) {
    const infoMatch = content.match(/type Info\s*=([\s\S]*?)(?=\ntype\s)/);
    if (!infoMatch)
        return [];
    return [...infoMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}
export function parseSpecs(files) {
    const specs = {};
    let declaredInfos = [];
    for (const file of files) {
        if (file.fileName === "project.decisions.ts") {
            declaredInfos = parseInfoUnion(file.content);
            continue;
        }
        if (file.fileName.endsWith(".spec.ts")) {
            const name = file.fileName.replace(".spec.ts", "");
            specs[name] = parseSpecContent(file.content);
        }
    }
    return { specs, declaredInfos };
}
