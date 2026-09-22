#!/usr/bin/env python3
"""
Script para criar usuário admin no Supabase
Execute: python3 criar-admin.py
"""

import requests
import json

# Configurações Supabase
SUPABASE_URL = "https://pvqikdeovfgbslfqjmxy.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cWlrZGVvdmZnYnNsZnFqbXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4NzI3OTg3NiwiZXhwIjoxNzAzMDI3NDc2fQ.8X-xZQaUxWz1kJ2HGQ6GQjcUAUGZ4vC-LmXZ-kI7YiQ"

email = "admin@moromizato.com.br"
password = "senhaSegura2026!@#"

headers = {
    "apikey": "sb_publishable_4KZqDuVMsHQhzzZjsRuQUg_ese9wsRu",
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

data = {
    "email": email,
    "password": password,
    "email_confirm": True,
    "user_metadata": {"role": "admin"}
}

print("🔄 Criando usuário admin...")
print(f"Email: {email}")
print(f"URL: {SUPABASE_URL}/auth/v1/admin/users")

try:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=headers,
        json=data,
        verify=True
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 201:
        print("✅ Usuário criado com sucesso!")
        user_data = response.json()
        print(f"User ID: {user_data.get('id')}")
        print("\n🎉 Agora você pode fazer login em:")
        print("   https://formularioinstituto.vercel.app/admin")
        print(f"   Email: {email}")
        print(f"   Senha: {password}")
    else:
        print(f"❌ Erro ao criar usuário")
        if response.status_code == 400:
            print("   Possível causa: Email já existe ou inválido")
        elif response.status_code == 401:
            print("   Possível causa: Token de autenticação inválido/expirado")

except Exception as e:
    print(f"❌ Erro de conexão: {e}")
    print("\nTente copiar e colar este comando no terminal:")
    print(f'\ncurl -X POST "{SUPABASE_URL}/auth/v1/admin/users" \\')
    print(f'  -H "apikey: sb_publishable_4KZqDuVMsHQhzzZjsRuQUg_ese9wsRu" \\')
    print(f'  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \\')
    print(f'  -H "Content-Type: application/json" \\')
    print(f'  -d \'{json.dumps(data)}\'')
