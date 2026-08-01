---
title: Supported Markdown Features
description: Complete list of markdown syntax and extensions supported by mdts
category: Documentation
tags:
  - markdown
  - syntax
  - features
  - gfm
---

`mdts` provides a rich Markdown reading experience by supporting the full [CommonMark](https://commonmark.org/) specification along with many popular extensions like GitHub Flavored Markdown (GFM) and additional enhancements for modern documentation.

## ✅ CommonMark Features

All standard Markdown syntax is fully supported:

- **Headings**: `# H1` through `###### H6`
- **Paragraphs**: Regular text blocks
- **Emphasis**:  
  - Bold: `**text**` or `__text__`  
  - Italic: `*text*` or `_text_`
- **Blockquotes**: Using `> `
- **Lists**:  
  - Ordered: `1. Item`  
  - Unordered: `- Item` or `* Item`
- **Code**:  
  - Inline: `` `code` ``  
  - Block: <code>```lang</code>
- **Links**: `[label](https://example.com)`
- **Images**: `![alt text](image.png)`
- **Horizontal Rules**: `---`, `***`, or `___`

## 🚀 Extended Features

### 📊 Tables

Render structured data in table format.

```markdown
| Name     | Age | City      |
|----------|:---:|----------:|
| Alice    |  30 | Tokyo     |
| Bob      |  25 | New York  |
```

### ☑️ Task Lists

Perfect for checklists and todos.

```markdown
- [x] Write documentation
- [ ] Implement feature
```

### 💡 GitHub Flavored Markdown (GFM)

`mdts` supports most GFM extensions, including:

* **Autolinks**: Bare URLs like `https://example.com` become clickable links
* **Strikethrough**: `~~text~~` renders as ~~text~~
* **Tables & Task Lists**: (as shown above)

We aim to maintain compatibility with widely adopted Markdown standards to ensure smooth reading, sharing, and collaboration across platforms.

### 🎨 Advanced Syntax Highlighting
Code blocks get professional syntax highlighting with customizable themes through the settings dialog.

````markdown
```rust
fn main() {
    println!("Hello, mdts!");
}
```
````

Choose from popular themes like Atom One Dark, GitHub, VS Code, and many more to match your preferred coding environment.

### 🔗 Footnotes

Add footnotes for inline references.

```markdown
Here is some text with a footnote[^1].

[^1]: This is the footnote text.
```

### 📄 Frontmatter

Add YAML metadata at the top of your Markdown files.

```yaml
---
title: "Sample Doc"
author: "Jane Doe"
tags: ["mdts", "docs"]
---
```

### 🧱 Inline HTML

Directly embed raw HTML when needed.

```markdown
This is <strong>bold</strong> using HTML.
```

### 🧠 Mermaid Diagrams

Visualize workflows and diagrams using Mermaid.js.

````markdown
```mermaid
graph TD;
    A[Start] --> B[Process];
    B --> C{Decision};
    C -->|Yes| D[End];
    C -->|No| A;
```
````

### 🎯 PlantUML Diagrams

Create UML diagrams with PlantUML syntax for sequence diagrams, class diagrams, and more.

````markdown
```plantuml
@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml
```

```puml
@startuml
class Car {
  +String brand
  +start()
  +stop()
}
@enduml
```
````

Supports both `plantuml` and `puml` language identifiers. Diagrams are rendered locally by default. Set the `PLANTUML_SERVER` environment variable (e.g. `PLANTUML_SERVER=http://localhost:9274`) to render through your own PlantUML server instead.

Interactive SVG is supported in the rendered preview:

- When rendering through a PlantUML server, mdts automatically injects the `!pragma svgInteractive true` into the diagram, so diagrams come back as interactive SVG when the server supports it.
- Interactive behaviors work in the viewer: on class/object/usecase/deployment diagrams, hovering or clicking an element grays out everything not connected to it (double-click highlights the whole connected line); on sequence diagrams, clicking a participant highlights its messages and a floating header can be pinned; `[[...]]` links and `[[url{tooltip} label]]` tooltips work in any diagram type.

### 🧮 Math Formulas (KaTeX)

Render beautiful mathematical expressions using LaTeX syntax with KaTeX.

````markdown
```math
L = \frac{1}{2} \rho v^2 S C_L
```

Inline math: $E = mc^2$
````

Both block-level and inline mathematical expressions are fully supported with professional rendering quality.

### 📢 GitHub-Style Alerts

Create admonitions like notes, tips, and warnings.

```markdown
> [!NOTE]
> This is a note.

> [!WARNING]
> This is a warning.
```
