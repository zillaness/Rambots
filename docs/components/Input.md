---
category: Forms
---

# Input

A labelled text input with helper and error states. Focus draws a Rambot Red
ring; the error state borders the control in red and shows the message.

- `label`, `help`, and `error` are all optional.
- `required` marks the field and shows a red asterisk.
- Passing `error` switches the field into its error style.

```tsx
import { Input } from '@rambots/design-system';

<Input label="Team email" type="email" placeholder="you@rambots.org" required />
<Input label="Team number" error="Team number is required" />
```
