# 🔐 Guia de Segurança - Instituto Moromizato

## Status Atual
⚠️ **DESENVOLVIMENTO** - Sistema ainda não está pronto para produção com dados reais

---

## 1. Problemas de Segurança Atuais

### 🔴 CRÍTICO
- **Credenciais hardcoded no código**
  - Email/senha do admin no arquivo JavaScript
  - API Key pública no código-fonte
  - Supabase URL exposta

- **RLS desativado no Supabase**
  - Qualquer um pode ler/escrever no banco se tiver acesso à API

- **Sem autenticação real**
  - Login é apenas verificação de texto (não é seguro)
  - Sem sessão autenticada no Supabase

---

## 2. Checklist de Segurança Antes da Publicação

### A. Supabase - Ativar RLS (Row Level Security)

**1. Acessar Supabase**
```
https://supabase.com → Seu Projeto → Authentication → Policies
```

**2. Habilitar RLS na tabela `respostas_pre_consulta`**
- Ir em SQL Editor
- Executar:
```sql
ALTER TABLE respostas_pre_consulta ENABLE ROW LEVEL SECURITY;
```

**3. Criar política para permitir INSERT público (formulário paciente)**
```sql
CREATE POLICY "Pacientes podem submeter respostas"
ON respostas_pre_consulta
FOR INSERT
WITH CHECK (true);
```

**4. Criar política para permitir SELECT apenas para admin autenticado**
```sql
CREATE POLICY "Apenas admin pode ler respostas"
ON respostas_pre_consulta
FOR SELECT
USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');
```

---

### B. Vercel - Adicionar Variáveis de Ambiente Seguras

Já feito! Mas verificar:

1. **Na dashboard da Vercel:**
   - Settings → Environment Variables
   - Confirmar que `SUPABASE_API_KEY` está como "Sensitive"

2. **Remover credenciais do código:**
   - Remover email/senha hardcoded do admin
   - Usar Supabase Auth ao invés de verificação de texto

---

### C. Supabase Auth - Configurar Autenticação Real

**1. Ativar Email Auth**
- Supabase Dashboard → Authentication → Providers
- Habilitar "Email"

**2. Criar usuário admin**
```sql
-- Via Supabase SQL Editor
SELECT auth.create_user(
  email => 'seu-email@admin.com',
  password => 'senha-muito-segura-123!@#',
  email_confirm => true,
  user_metadata => '{"role": "admin"}'
);
```

**3. Atualizar admin/index.html para usar Supabase Auth**

Substituir:
```javascript
// ANTES (inseguro)
const ADMIN_EMAIL = 'admin@moromizato.com.br';
const ADMIN_SENHA = 'senhaSegura2026';

if (email === ADMIN_EMAIL && senha === ADMIN_SENHA) {
  sessionStorage.setItem('admin_token', ...);
}
```

Por:
```javascript
// DEPOIS (seguro com Supabase Auth)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

if (error) {
  errDiv.textContent = error.message;
} else {
  localStorage.setItem('auth_token', data.session.access_token);
  carregarRespostas();
}
```

---

### D. Formulário Paciente - Remover Service Role Key

**Status:** ✅ Já feito (usando Edge Function)

Mas verificar:
- Formulário usa apenas `ENDPOINT` (Edge Function)
- Edge Function usa `service_role_key` (server-side, privado)
- Formulário não expõe credenciais

---

### E. Headers de Segurança - Vercel

Adicionar ao `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

---

## 3. Ordem de Implementação

### Fase 1: RLS (CRÍTICO - Fazer Primeiro)
- [ ] Ativar RLS em `respostas_pre_consulta`
- [ ] Criar política para INSERT público
- [ ] Testar formulário ainda funciona
- [ ] Deploy na Vercel

### Fase 2: Auth (IMPORTANTE)
- [ ] Criar usuário admin via Supabase Auth
- [ ] Atualizar código do admin para usar Auth
- [ ] Remover credenciais hardcoded
- [ ] Testar login no admin
- [ ] Deploy na Vercel

### Fase 3: Headers (RECOMENDADO)
- [ ] Adicionar headers de segurança ao vercel.json
- [ ] Deploy na Vercel

### Fase 4: Teste Completo (OBRIGATÓRIO)
- [ ] Formulário paciente envia respostas ✓
- [ ] Admin consegue fazer login ✓
- [ ] Admin consegue ler respostas ✓
- [ ] Formulário não acessa respostas de outros ✓
- [ ] Admin não consegue enviar como paciente ✓

---

## 4. Teste de Segurança Rápido

Depois de implementar, testar no DevTools do navegador:

```javascript
// Isso NÃO deve funcionar (sem auth)
fetch('https://pvqikdeovfgbslfqjmxy.supabase.co/rest/v1/respostas_pre_consulta', {
  headers: {
    'apikey': 'sb_publishable_...',
    'Authorization': 'Bearer sb_publishable_...'
  }
})
// → 403 Forbidden (esperado com RLS)

// Isso DEVE funcionar (Edge Function)
fetch('https://seu-formulario.vercel.app/api/enviar-pre-consulta', {
  method: 'POST',
  body: JSON.stringify({...})
})
// → 200 OK
```

---

## 5. Checklist Final Antes de Publicar

- [ ] RLS ativado no Supabase
- [ ] Políticas de acesso criadas
- [ ] Auth real implementado no admin
- [ ] Credenciais removidas do código
- [ ] Headers de segurança adicionados
- [ ] Testes de segurança passando
- [ ] URL segura (HTTPS - Vercel já faz)
- [ ] Admin consegue fazer login
- [ ] Admin consegue ver respostas
- [ ] Formulário paciente funciona
- [ ] Dados reais começando a chegar

---

## 6. Monitoramento Contínuo

Após publicar:
- Monitorar Supabase logs para acessos não-autorizados
- Verificar Vercel analytics
- Fazer backup automático das respostas
- Atualizar senha admin regularmente

---

## 7. Referências

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Status:** 🔴 Não publicar com dados reais até completar Fase 1 + Fase 2

**Responsável:** Jeff (Instituto Moromizato)  
**Data:** 2026-09-22
