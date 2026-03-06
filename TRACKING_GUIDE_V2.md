# MindContent SDK - Guia Simplificado de Implementação

## 🎯 Regra Simples

O MindContent SDK **detecta automaticamente** o modo de operação:

| Situação | Comportamento |
|----------|---------------|
| ✅ **TEM** `<div id="mindcontent">` | **Modo Completo**: Modal + Conteúdo Dinâmico + WebSocket + AI + Tracking |
| ❌ **NÃO TEM** `<div id="mindcontent">` | **Modo Tracking Only**: Apenas coleta dados (sem modal, sem AI, sem Contentful) |

**Não precisa de configuração extra!** O SDK detecta sozinho. 🚀

---

## 📄 Exemplo: Página com Conteúdo Dinâmico (Home)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Home - MindContent</title>
</head>
<body data-page-title="Home">
    <div class="hero">
        <h1>Bem-vindo!</h1>
    </div>

    <!-- ✅ Esta div ATIVA o modo completo -->
    <div id="mindcontent" data-page-id="9"></div>

    <script src="mindcontent-loader.js"></script>
</body>
</html>
```

### O que acontece:
- ✅ Mostra modal de consentimento
- ✅ Cria iframe com React app
- ✅ Conecta WebSocket
- ✅ Busca conteúdo no Contentful
- ✅ Injeta componentes dinâmicos
- ✅ Rastreia visitas e comportamento
- ✅ Sidebar com dados + AI

---

## 📄 Exemplo: Página Apenas Tracking (Services)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Services - MindContent</title>
</head>
<body data-page-title="Services">
    <div class="hero">
        <h1>Nossos Serviços</h1>
        <p>Conheça nossas soluções</p>
    </div>

    <!-- Seu conteúdo estático aqui -->
    
    <!-- ❌ SEM div#mindcontent = tracking only -->
    
    <script src="mindcontent-loader.js"></script>
</body>
</html>
```

### O que acontece:
- ❌ Não mostra modal
- ❌ Não cria iframe
- ❌ Não conecta WebSocket
- ❌ Não busca Contentful
- ❌ Não injeta componentes
- ✅ Rastreia visitas e comportamento
- ✅ Sidebar com dados do usuário

---

## 📊 Dados Rastreados (Ambos os Modos)

Independente do modo, o SDK sempre coleta:

### Dados de Visita
- **user_id**: UUID gerado automaticamente
- **session_id**: ID da sessão (único por aba)
- **page_url**: URL completa da página
- **previous_page_url**: Página anterior (referrer + sessionStorage)
- **visited_at**: Data e hora da visita
- **user_agent**: Informações do navegador
- **ip_address**: Endereço IP (capturado no backend)

### Dados de Comportamento
- Cliques e hovers
- Padrão de scroll
- Seleções de texto
- Tempo na página
- Informações de dispositivo

---

## 🎨 Estrutura Recomendada

### Para o seu projeto `/mindcontent`:

```
📁 mindcontent/
├── 📄 index.html       → TEM div#mindcontent (Modo Completo)
├── 📄 services.html    → SEM div#mindcontent (Tracking Only)
├── 📄 products.html    → SEM div#mindcontent (Tracking Only)
└── 📄 contact.html     → SEM div#mindcontent (Tracking Only)
```

**Resultado:**
- **Home**: Conteúdo personalizado + AI + Tracking
- **Outras páginas**: Apenas tracking de dados

---

## 🔍 Como Verificar no Console

Abra DevTools (F12) e navegue entre as páginas:

### Modo Completo (index.html):
```
[MindContent SDK] 🔍 Content display detection: ENABLED (div#mindcontent found)
[MindContent SDK] 🎯 showIntentModal called
[MindContent SDK] 📊 Tracking page visit: {...}
[MindContent SDK] ✅ Page visit tracked: { success: true, visit_id: 123 }
[MindContent SDK] 🎨 Embedding React app...
```

### Modo Tracking Only (services.html):
```
[MindContent SDK] 🔍 Content display detection: DISABLED (div#mindcontent not found)
[MindContent SDK] 📊 Tracking-only mode (no content container found)
[MindContent SDK] 📊 Tracking page visit: {...}
[MindContent SDK] ✅ Page visit tracked: { success: true, visit_id: 124 }
```

---

## 🚀 Migração de Páginas Existentes

Se você já tem páginas com o SDK antigo:

### Era assim (configuração manual):
```html
<div id="mindcontent"></div>
<script src="mindcontent-loader.js"></script>
<script>
    MindContent.init({ enableContentDisplay: false });
</script>
```

### Agora é assim (detecção automática):
```html
<!-- Sem div#mindcontent -->
<script src="mindcontent-loader.js"></script>
```

**Simplesmente remova a div!** 🎉

---

## 📈 Consultar Visitas no Banco

```sql
-- Ver últimas 10 visitas
SELECT TOP 10 
    id,
    page_url,
    previous_page_url,
    visited_at,
    session_id
FROM PageVisits
ORDER BY visited_at DESC;

-- Estatísticas de modo
SELECT 
    CASE 
        WHEN page_url LIKE '%index.html%' THEN 'Full Mode'
        ELSE 'Tracking Only'
    END as mode,
    COUNT(*) as visits
FROM PageVisits
GROUP BY 
    CASE 
        WHEN page_url LIKE '%index.html%' THEN 'Full Mode'
        ELSE 'Tracking Only'
    END;
```

---

## ✅ Checklist de Implementação

- [ ] **Página Home**: Tem `<div id="mindcontent" data-page-id="X"></div>`
- [ ] **Outras páginas**: Não tem `div#mindcontent`
- [ ] **Todas as páginas**: Carregam `mindcontent-loader.js`
- [ ] **Banco de dados**: Tabela `PageVisits` criada
- [ ] **Backend**: Rodando em http://localhost:8000
- [ ] **Frontend**: Rodando em http://localhost:5173
- [ ] **Teste**: Navegou entre páginas e viu tracking funcionando

---

## 🎯 Benefícios da Nova Abordagem

✅ **Mais Simples**: Sem configuração manual  
✅ **Mais Intuitivo**: Se tem div, mostra conteúdo. Se não tem, só rastreia.  
✅ **Menos Código**: Não precisa de `init()` personalizado  
✅ **Mais Declarativo**: A estrutura HTML define o comportamento  
✅ **Menos Erros**: Impossível esquecer de configurar  

---

## 🆘 Troubleshooting

### Problema: Página deveria ter conteúdo mas não mostra
**Solução:** Verifique se tem `<div id="mindcontent"></div>` no HTML

### Problema: Modal aparece em página que não deveria
**Solução:** Remova a `<div id="mindcontent">` daquela página

### Problema: Tracking não está funcionando
**Solução:** 
1. Verifique se `mindcontent-loader.js` está carregando
2. Abra console (F12) e veja se há erros
3. Verifique se backend está rodando

---

**Pronto!** Sistema de tracking implementado de forma simples e eficiente. 🎉
