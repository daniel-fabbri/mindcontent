# MindContent SDK - Guia de Implementação para Tracking de Visitas

## 📊 Visão Geral

O MindContent SDK agora suporta dois modos de operação:

1. **Modo Completo (padrão)**: Exibe conteúdo dinâmico + rastreia visitas
2. **Modo Tracking Only**: Apenas rastreia visitas sem exibir conteúdo

## 🎯 Como Usar

### Modo Completo (Com Conteúdo Dinâmico)

Use na **página inicial** ou em páginas onde você quer exibir conteúdo personalizado:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body data-page-title="Home">
    <!-- Seu conteúdo estático aqui -->
    <div class="hero">
        <h1>Bem-vindo ao MindContent</h1>
        <p>Conteúdo inteligente e personalizado</p>
    </div>

    <!-- Container onde o conteúdo dinâmico será injetado -->
    <div id="mindcontent" data-page-id="9"></div>

    <!-- Carregue o SDK normalmente -->
    <script src="mindcontent-loader.js"></script>
</body>
</html>
```

### Modo Tracking Only (Sem Conteúdo Dinâmico)

Use em **todas as outras páginas** (Services, Products, Contact, etc.) onde você só quer rastrear visitas:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body data-page-title="Services">
    <!-- Seu conteúdo estático aqui -->
    <div class="hero">
        <h1>Nossos Serviços</h1>
        <p>Descubra o que podemos fazer por você</p>
    </div>

    <!-- Container vazio - SDK não vai injetar conteúdo aqui -->
    <div id="mindcontent" data-enable-content="false"></div>

    <!-- Carregue o SDK normalmente -->
    <script src="mindcontent-loader.js"></script>
</body>
</html>
```

**OU de forma mais simples**, inicialize manualmente com a configuração:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body data-page-title="Products">
    <!-- Seu conteúdo estático aqui -->
    <div class="hero">
        <h1>Nossos Produtos</h1>
        <p>Conheça nossas soluções</p>
    </div>

    <!-- Carregue o SDK -->
    <script src="mindcontent-loader.js"></script>
    
    <!-- Inicialização manual com tracking only -->
    <script>
        // Aguarda o SDK carregar
        document.addEventListener('DOMContentLoaded', function() {
            if (window.MindContent) {
                window.MindContent.init({
                    enableContentDisplay: false  // Apenas tracking, sem conteúdo
                });
            }
        });
    </script>
</body>
</html>
```

## 📋 Dados Rastreados

Cada visita registra automaticamente:

- **user_id**: UUID do usuário anônimo (armazenado no localStorage)
- **session_id**: ID da sessão (armazenado no sessionStorage, único por aba do navegador)
- **page_url**: URL completa da página visitada
- **previous_page_url**: URL anterior (referrer)
- **visited_at**: Data e hora da visita
- **user_agent**: Informações do navegador
- **ip_address**: Endereço IP do visitante (capturado no backend)

## 🔄 Comportamento

### Modo Completo (`enableContentDisplay: true` - padrão)
- ✅ Registra visita no banco de dados
- ✅ Exibe modal de consentimento
- ✅ Cria iframe com React app
- ✅ Injeta componentes dinâmicos
- ✅ Tracking de comportamento (cliques, scroll, etc.)

### Modo Tracking Only (`enableContentDisplay: false`)
- ✅ Registra visita no banco de dados
- ❌ Não exibe modal de consentimento
- ❌ Não cria iframe
- ❌ Não injeta componentes
- ✅ Tracking básico de comportamento permanece ativo

## 📊 Consultar Visitas

Você pode consultar as visitas através dos endpoints:

```bash
# Total de visitas
GET /api/visits/stats/total

# Visitas de um usuário específico
GET /api/visits/user/{user_id}?limit=50
```

## 🎨 Exemplo de Implementação Completa

### index.html (Modo Completo)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Home - MindContent</title>
</head>
<body data-page-title="Home">
    <div class="hero">
        <h1>Let AI read the room. Deliver what matters.</h1>
        <p>Transform your website with intelligent, personalized content experiences</p>
    </div>

    <!-- Conteúdo dinâmico será injetado aqui -->
    <div id="mindcontent" data-page-id="9"></div>

    <script src="site-components.js"></script>
    <script src="mindcontent-loader.js"></script>
</body>
</html>
```

### services.html (Tracking Only)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Services - MindContent</title>
</head>
<body data-page-title="Services">
    <div class="hero">
        <h1>🎯 Specialized Services</h1>
        <p>Expert consulting and support to maximize your results</p>
    </div>

    <!-- Apenas tracking, sem injeção de conteúdo -->
    <div id="mindcontent" style="display:none;"></div>

    <script src="site-components.js"></script>
    <script src="mindcontent-loader.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (window.MindContent) {
                window.MindContent.init({ enableContentDisplay: false });
            }
        });
    </script>
</body>
</html>
```

## 🚀 Implementação Recomendada

Para o seu projeto `/mindcontent`:

1. **index.html**: Use modo completo (padrão) ✅
2. **services.html**: Use tracking only
3. **products.html**: Use tracking only
4. **contact.html**: Use tracking only

Dessa forma, apenas a home exibe conteúdo dinâmico, mas **todas as páginas rastreiam visitas**!

## 🔍 Verificar se está Funcionando

Abra o Console do navegador (F12) e você verá mensagens como:

```
[MindContent SDK] 📊 Tracking page visit: { user_id: "...", session_id: "...", page_url: "...", ... }
[MindContent SDK] ✅ Page visit tracked: { success: true, visit_id: 123 }
```

Se `enableContentDisplay: false`, você também verá:
```
[MindContent SDK] Content display disabled - tracking only mode
```

## 🎯 Próximos Passos

1. Execute o SQL para criar a tabela `PageVisits` no seu banco
2. Atualize suas páginas HTML conforme os exemplos acima
3. Teste navegando entre as páginas
4. Consulte o banco de dados para ver as visitas registradas!
