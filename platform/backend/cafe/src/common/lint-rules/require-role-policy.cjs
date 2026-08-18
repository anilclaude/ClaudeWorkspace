'use strict';

// Build-time enforcement for cafe-access-roles AC5 ("even 'logged in only,
// any role' must be stated, not assumed") / VC-004 ("a build-time check
// fails if one is missing"). Wired into the root eslint.config.mjs, scoped to
// backend/cafe/src/modules/**/*.controller.ts (see that file for the `files`
// glob) so `pnpm lint` fails the build if an HTTP-decorated controller method
// ships with no role policy declared.
//
// Mirrors backend/cafe/src/common/guards/roles.guard.ts's own precedence
// exactly, on purpose: a method-level @RequireRoles(...)/@Public() wins
// outright when present; the class level is only consulted as a fallback
// when the method itself has neither. Keeping these two pieces of logic in
// sync is what makes "statically declared" and "actually enforced at
// request time" the same claim.

// Every HTTP verb decorator NestJS's @nestjs/common exports that creates a
// routable handler. A method with none of these is not an endpoint (a plain
// helper method, a lifecycle hook, etc.) and is out of scope for this check.
const HTTP_METHOD_DECORATORS = new Set([
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'Options',
  'Head',
  'All',
]);

function getDecoratorName(decorator) {
  const expr = decorator.expression;
  if (expr.type === 'CallExpression' && expr.callee.type === 'Identifier') {
    return expr.callee.name;
  }
  if (expr.type === 'Identifier') {
    return expr.name;
  }
  return null;
}

function classifyRolePolicy(decorators) {
  let isPublic = false;
  let hasRoles = false;
  for (const decorator of decorators || []) {
    const name = getDecoratorName(decorator);
    if (name === 'Public') isPublic = true;
    if (name === 'RequireRoles') hasRoles = true;
  }
  return { isPublic, hasRoles, declared: isPublic || hasRoles };
}

function isHttpHandler(decorators) {
  return (decorators || []).some((decorator) => {
    const name = getDecoratorName(decorator);
    return name !== null && HTTP_METHOD_DECORATORS.has(name);
  });
}

module.exports = {
  rules: {
    'require-role-policy': {
      meta: {
        type: 'problem',
        docs: {
          description:
            "Every HTTP-decorated controller method must declare @RequireRoles(...) or @Public() — method-level wins outright when present, class-level is only a fallback when the method has neither.",
        },
        schema: [],
        messages: {
          missingPolicy:
            "'{{name}}' handles an HTTP request but declares neither @RequireRoles(...) nor @Public(), and class '{{className}}' has no class-level fallback either. An endpoint must state its role policy, not leave it assumed (AC5).",
          conflictingPolicy:
            "'{{name}}' declares both @Public() and @RequireRoles(...) on the same method. At runtime @Public() silently wins and the roles are ignored — declare exactly one.",
        },
      },
      create(context) {
        return {
          ClassDeclaration(classNode) {
            const classPolicy = classifyRolePolicy(classNode.decorators);
            const className = classNode.id ? classNode.id.name : '<anonymous>';

            for (const member of classNode.body.body) {
              if (member.type !== 'MethodDefinition') continue;
              if (!isHttpHandler(member.decorators)) continue;

              const methodName =
                member.key && member.key.type === 'Identifier' ? member.key.name : '<computed>';
              const methodPolicy = classifyRolePolicy(member.decorators);

              if (methodPolicy.isPublic && methodPolicy.hasRoles) {
                context.report({
                  node: member,
                  messageId: 'conflictingPolicy',
                  data: { name: methodName },
                });
                continue;
              }

              if (!methodPolicy.declared && !classPolicy.declared) {
                context.report({
                  node: member,
                  messageId: 'missingPolicy',
                  data: { name: methodName, className },
                });
              }
            }
          },
        };
      },
    },
  },
};
