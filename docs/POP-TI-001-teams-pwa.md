# POP-TI-001 — Implantação do Microsoft Teams Web como PWA corporativo

| Campo | Conteúdo |
|---|---|
| **Código** | POP-TI-001 |
| **Versão** | 1.0 |
| **Data de emissão** | 13/08/2026 |
| **Área responsável** | Tecnologia da Informação |
| **Classificação** | Uso interno |
| **Documento de origem** | Nota Técnica — "Microsoft Teams Web como PWA em ambiente corporativo" |
| **Próxima revisão** | Após conclusão do piloto (Fase 5) |

---

## 1. Objetivo

Padronizar a instalação, a configuração, a homologação e a implantação em massa do Microsoft Teams Web como PWA (Progressive Web App) via Microsoft Edge, garantindo **entrega confiável de notificações de mensagens, menções e chamadas no Windows** sem dependência de manter uma aba do navegador aberta.

## 2. Escopo

**Dentro do escopo:** estações Windows 10/11 corporativas, Microsoft Edge (canal Stable), contas Microsoft 365 do tenant corporativo, notificações de chat/menção/chamada/reunião, políticas de gerenciamento via GPO ou Intune.

**Fora do escopo:** dispositivos móveis (iOS/Android), macOS/Linux, Teams Rooms e dispositivos certificados, migração dos demais aplicativos Office para Web, telefonia PSTN / Direct Routing, retenção e compliance de mensagens.

## 3. Definições

| Termo | Definição |
|---|---|
| **PWA** | Aplicação web instalada localmente, com janela, ícone e ciclo de vida próprios, integrada ao sistema operacional. |
| **Service Worker** | Processo em segundo plano do navegador que recebe o push e dispara a notificação. Se for descarregado, a notificação não chega. |
| **Sleeping Tabs** | Recurso do Edge que suspende páginas ociosas para economizar memória. Suspende também o Teams. |
| **WNS** | Windows Notification Service — canal por onde o Edge entrega a notificação ao Windows. |
| **Estação piloto** | Máquina do grupo de homologação da Fase 5. |

## 4. Papéis e responsabilidades

| Atividade | Executa | Aprova |
|---|---|---|
| Verificação de licenciamento (Fase 0) | Administrador M365 | Gestor de TI |
| Instalação e configuração piloto (Fases 1–4) | Analista de Suporte | — |
| Publicação de políticas GPO/Intune (Fase 3) | Administrador de Infraestrutura | Gestor de TI |
| Liberação de rede/proxy (Fase 4) | Administrador de Rede | Gestor de TI |
| Homologação (Fase 5) | Usuários piloto + Analista de Suporte | Gestor de TI |
| Implantação geral (Fase 6) | Administrador de Infraestrutura | Gestor de TI |
| Suporte pós-implantação (Seção 8) | Service Desk (N1) | — |

## 5. Pré-requisitos

- [ ] Microsoft Edge versão **116 ou superior** (`edge://settings/help`) — versões anteriores não suportam `WebAppSettings.run_on_os_login`.
- [ ] Estação ingressada no domínio ou gerenciada por Intune.
- [ ] Conta corporativa Microsoft 365 ativa e licenciada para Teams.
- [ ] Acesso administrativo ao Group Policy Management ou ao Intune (Settings Catalog).
- [ ] Windows 10 22H2+ ou Windows 11.

---

## FASE 0 — Verificação prévia obrigatória (licenciamento)

> **Não execute as demais fases antes de concluir esta.** Existe a possibilidade de o esforço de PWA ser desnecessário.

**Premissa a validar:** o direito de uso do **cliente desktop do Microsoft Teams não está vinculado à licença de Office desktop**. Planos web-first (ex.: Microsoft 365 Business Basic, Office 365 E1) historicamente incluem o app desktop do Teams. Desde abril/2024, porém, a Microsoft passou a comercializar SKUs "**no Teams**" (sem Teams), nos quais o Teams é licenciado à parte. O resultado depende do SKU efetivamente contratado.

### 0.1 Procedimento

1. Acessar **Microsoft 365 admin center → Faturamento → Seus produtos**.
2. Registrar o nome exato do SKU contratado (ex.: `Microsoft 365 Business Basic` vs `Microsoft 365 Business Basic (no Teams)`).
3. Confirmar em **Faturamento → Licenças** se há licença de Teams atribuída aos usuários.
4. Registrar o resultado na tabela abaixo.

| SKU contratado | Inclui Teams? | Decisão |
|---|---|---|
| | ( ) Sim  ( ) Não | |

### 0.2 Critério de decisão

| Resultado | Ação |
|---|---|
| SKU **inclui** Teams | Avaliar o cliente desktop do Teams (Teams 2.x, baseado em WebView2, consumo de memória comparável ao PWA) **antes** de investir na esteira de PWA. O desktop entrega notificação, chamada em segundo plano e inicialização automática sem política adicional. Se ainda assim a diretriz for padronizar PWA, prosseguir para a Fase 1 registrando a justificativa. |
| SKU **não inclui** Teams | Prosseguir para a Fase 1. O PWA é a solução adequada. |

**Saída da fase:** decisão registrada e aprovada pelo Gestor de TI.

---

## FASE 1 — Instalação do PWA (estação piloto, manual)

Executar em cada estação piloto, logado com a conta do usuário final.

| # | Ação | Resultado esperado |
|---|---|---|
| 1.1 | Abrir o Microsoft Edge e acessar `https://teams.microsoft.com` | Página de autenticação |
| 1.2 | Autenticar com a conta corporativa e marcar "Continuar conectado" | Teams carrega completamente |
| 1.3 | Menu `...` → **Aplicativos** → **Instalar este site como um aplicativo** (ou o ícone de instalação na barra de endereços) | Diálogo "Instalar Microsoft Teams" |
| 1.4 | Confirmar a instalação | Teams abre em **janela própria**, sem barra de endereços |
| 1.5 | Na janela do Teams: menu `...` → **Configurações do aplicativo** | Painel de configurações do PWA |
| 1.6 | Ativar **"Iniciar aplicativo quando o dispositivo for iniciado"** | Opção marcada |
| 1.7 | Clicar com o botão direito no ícone da barra de tarefas → **Fixar na barra de tarefas** | Ícone fixado |
| 1.8 | Reiniciar a estação | Teams abre automaticamente após o logon |

**Verificação objetiva da Fase 1** — na janela do PWA, `edge://web-app-internals/`:
- O Teams deve constar na lista de apps instalados.
- **Anotar o `manifest_id`** exibido. Ele será necessário na Fase 3.

---

## FASE 2 — Configuração de notificações (três camadas)

A notificação só chega ao usuário se as **três** camadas estiverem liberadas. A falha em qualquer uma produz o mesmo sintoma: silêncio total. Configurar e verificar na ordem abaixo.

### 2.1 Camada 1 — Windows

| # | Caminho | Configuração exigida |
|---|---|---|
| 2.1.1 | Configurações → Sistema → **Notificações** | Chave geral **Ativada** |
| 2.1.2 | Mesma tela, lista de aplicativos | **Microsoft Edge** presente e **Ativado** |
| 2.1.3 | Microsoft Edge → expandir | "Mostrar banners de notificação" e "Mostrar notificações na central de notificações" **ativados** |
| 2.1.4 | Notificações → **Ativar não incomodar automaticamente** | Desmarcar **"Ao duplicar a tela"** |
| 2.1.5 | Idem | Desmarcar "Ao jogar" e "Ao usar um aplicativo em modo de tela inteira" |
| 2.1.6 | Notificações → **Não incomodar** | Desativado |

> **2.1.4 é a causa raiz mais frequente e menos óbvia.** Com "Ao duplicar a tela" ativo, toda estação conectada a projetor ou TV de sala de reunião para de exibir notificações — sem qualquer erro visível.

### 2.2 Camada 2 — Microsoft Edge

| # | Caminho | Configuração exigida |
|---|---|---|
| 2.2.1 | `edge://settings/content/notifications` | `https://teams.microsoft.com` na lista **Permitir** |
| 2.2.2 | Mesma tela | Desativar **"Solicitações silenciosas de notificação"** (impede que o prompt apareça) |
| 2.2.3 | `edge://settings/system` | **"Continuar executando extensões e aplicativos em segundo plano quando o Microsoft Edge estiver fechado"** → **Ativado** |
| 2.2.4 | `edge://settings/system` | **Guias adormecidas**: adicionar `teams.microsoft.com` em "Nunca colocar estes sites para dormir" |
| 2.2.5 | `edge://settings/privacy` | "Limpar dados de navegação ao fechar" **não** deve incluir cookies nem dados de sites hospedados |
| 2.2.6 | `edge://settings/content/cookies` | Cookies de terceiros permitidos para `[*.]microsoft.com` |

### 2.3 Camada 3 — Microsoft Teams

| # | Caminho | Configuração exigida |
|---|---|---|
| 2.3.1 | Teams → `...` → **Configurações → Notificações e atividade** | — |
| 2.3.2 | **Estilo de notificação** | **"Windows"** (notificação do sistema), **não** "Integrada ao Teams" |
| 2.3.3 | **Chat** | Banner + feed |
| 2.3.4 | **Menções** (`@você`, `@equipe`, `@canal`) | Banner + feed |
| 2.3.5 | **Chamadas** | Banner |
| 2.3.6 | **Reuniões** | Lembretes ativados |
| 2.3.7 | **Silenciar notificações durante reuniões e chamadas** | Conforme política interna (recomendado: desativado durante o piloto, para não mascarar falhas) |
| 2.3.8 | Presença do usuário (foto de perfil) | **Não** deve estar em "Não incomodar" durante os testes |

### 2.4 Teste funcional das três camadas

Executar na janela do PWA do Teams:

1. Pressionar `F12` → aba **Console**.
2. Executar:

```javascript
Notification.permission
```
**Resultado esperado:** `"granted"`. Qualquer outro valor (`"default"` ou `"denied"`) reprova a Camada 2.

3. Executar:

```javascript
new Notification('Teste POP-TI-001', { body: 'Validacao de notificacao do Windows' })
```
**Resultado esperado:** banner do Windows no canto inferior direito. Se `Notification.permission` for `"granted"` e **nenhum banner aparecer**, a falha está na **Camada 1 (Windows)**.

4. Executar:

```javascript
navigator.serviceWorker.getRegistrations().then(r => console.log('SW registrados:', r.length))
```
**Resultado esperado:** valor **maior que 0**. Se for `0`, o service worker não registrou — revisar itens 2.2.5 e 2.2.6.

5. **Teste ponta a ponta:** de outro dispositivo/conta, enviar mensagem direta ao usuário piloto com a janela do Teams **minimizada**. O banner deve aparecer em até 5 segundos.

6. Repetir o item 5 com a janela do Teams **fechada** (apenas com o Edge fechado também). Depende de 2.2.3 e da Fase 3.

---

## FASE 3 — Políticas corporativas (GPO / Intune)

Substituem a configuração manual da Fase 2 (camada Edge) e tornam a configuração resistente à alteração pelo usuário.

### 3.1 Políticas a aplicar

| Política do Edge | Valor | Finalidade |
|---|---|---|
| `NotificationsAllowedForUrls` | `https://teams.microsoft.com` | Concede permissão de notificação sem prompt ao usuário |
| `SleepingTabsBlockedForUrls` | `teams.microsoft.com` | Impede a suspensão da página |
| `BackgroundModeEnabled` | `Habilitado` | Mantém o Edge em segundo plano após o fechamento da janela |
| `WebAppInstallForceList` | JSON (3.3) | Instala o PWA automaticamente |
| `WebAppSettings` | JSON (3.4) | Define inicialização automática e impede o fechamento pelo usuário |

> Manter `DefaultNotificationsSetting` no padrão (`Perguntar`). Não usar `Permitir` global — abriria notificação para qualquer site.

### 3.2 Aplicação

**Via GPO:** importar os ADMX do Edge no Central Store (`\\<dominio>\SYSVOL\<dominio>\Policies\PolicyDefinitions`), então
`Configuração do Computador → Modelos Administrativos → Microsoft Edge`.

**Via Intune:** `Dispositivos → Configuração → Criar política → Windows 10 e posterior → Catálogo de configurações → Microsoft Edge`.

**Chave de registro base (validação/aplicação direta):** `HKLM\SOFTWARE\Policies\Microsoft\Edge`

| Valor | Tipo | Dado |
|---|---|---|
| `BackgroundModeEnabled` | `REG_DWORD` | `1` |
| `NotificationsAllowedForUrls\1` | `REG_SZ` | `https://teams.microsoft.com` |
| `SleepingTabsBlockedForUrls\1` | `REG_SZ` | `teams.microsoft.com` |
| `WebAppInstallForceList` | `REG_SZ` | JSON da seção 3.3 |
| `WebAppSettings` | `REG_SZ` | JSON da seção 3.4 |

### 3.3 `WebAppInstallForceList`

```json
[
  {
    "url": "https://teams.microsoft.com/v2/",
    "default_launch_container": "window",
    "create_desktop_shortcut": true,
    "custom_name": "Microsoft Teams"
  }
]
```

### 3.4 `WebAppSettings`

```json
[
  {
    "manifest_id": "https://teams.microsoft.com/v2/",
    "run_on_os_login": "run_windowed",
    "prevent_close": true
  }
]
```

> **Atenção:** o `manifest_id` **deve ser confirmado** com o valor anotado no item de verificação da Fase 1 (`edge://web-app-internals/`). Um `manifest_id` divergente faz a política ser ignorada silenciosamente — sem erro em `edge://policy/`.
> `prevent_close` só tem efeito em conjunto com `run_on_os_login: "run_windowed"`.

### 3.5 Verificação da Fase 3

```powershell
gpupdate /force
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' | Format-List
```

Em seguida, no Edge: `edge://policy/` → **Recarregar políticas**. As cinco políticas devem aparecer com status **OK**. Qualquer status "Erro" ou "Valor ignorado" reprova a fase.

Confirmar também em `edge://discards/` que `teams.microsoft.com` não é elegível a descarte.

---

## FASE 4 — Rede e proxy

Liberar no firewall/proxy, **sem inspeção SSL** (a inspeção quebra o WebSocket do Teams e o canal de push):

| Finalidade | Destinos | Porta |
|---|---|---|
| Autenticação | `login.microsoftonline.com`, `login.microsoft.com` | TCP 443 |
| Teams (sinalização/chat) | `*.teams.microsoft.com`, `*.msg.teams.microsoft.com`, `*.skype.com`, `*.lync.com`, `*.sfbassets.com` | TCP 443 (inclui WSS) |
| **Push de notificação (WNS)** | `*.notify.windows.com`, `*.wns.windows.com` | TCP 443 |
| Mídia (áudio/vídeo/tela) | `13.107.64.0/18`, `52.112.0.0/14`, `52.122.0.0/15` | **UDP 3478–3481** |

> Bloqueio de UDP 3478–3481 não impede o login nem o chat: degrada apenas a qualidade da chamada, com fallback para TCP 443. É a causa clássica de "áudio picotado" reportado após a migração — e não aparece em teste de conectividade básico.
> Bloqueio de `*.notify.windows.com` produz exatamente o sintoma-alvo deste POP: **Teams funciona, mas não notifica**.

**Verificação:**

```powershell
Test-NetConnection teams.microsoft.com -Port 443
Test-NetConnection client.wns.windows.com -Port 443
```

Referência de endpoints a ser conferida antes da liberação (a Microsoft altera as faixas periodicamente): *Microsoft 365 URLs and IP address ranges* — ID 11 (Teams).

---

## FASE 5 — Homologação em piloto

**Amostra mínima:** 5 estações, cobrindo obrigatoriamente: 1 notebook em uso móvel, 1 estação com dois monitores, 1 estação de sala de reunião/projetor, 1 usuário de alto volume de chamadas.

**Duração mínima:** 5 dias úteis.

### 5.1 Checklist de homologação

Preencher um formulário por estação. **Reprovação em qualquer item marcado com ⚠ bloqueia a Fase 6.**

| # | Item de teste | OK | NOK |
|---|---|---|---|
| 5.1.1 | ⚠ Recebimento de mensagem de chat | | |
| 5.1.2 | ⚠ Notificação de nova mensagem com janela **minimizada** | | |
| 5.1.3 | ⚠ Notificação de nova mensagem com janela **fechada** | | |
| 5.1.4 | ⚠ Notificação de menção `@usuário` | | |
| 5.1.5 | ⚠ Notificação de chamada recebida | | |
| 5.1.6 | ⚠ Notificação de chamada com a estação ociosa há mais de 2 horas | | |
| 5.1.7 | Lembrete de reunião | | |
| 5.1.8 | Chamada de áudio — qualidade e latência | | |
| 5.1.9 | Chamada de vídeo — qualidade e latência | | |
| 5.1.10 | Participação em reunião agendada | | |
| 5.1.11 | Compartilhamento de tela (emissor) | | |
| 5.1.12 | Visualização de tela compartilhada (receptor) | | |
| 5.1.13 | Microfone reconhecido e funcional | | |
| 5.1.14 | Webcam reconhecida e funcional | | |
| 5.1.15 | Alto-falantes / fone reconhecidos | | |
| 5.1.16 | Troca de dispositivo de áudio durante a chamada | | |
| 5.1.17 | ⚠ Inicialização automática após reinicialização | | |
| 5.1.18 | ⚠ Notificação funcional após reinicialização (sem reconfiguração) | | |
| 5.1.19 | Autenticação persistente (sem novo login diário) | | |
| 5.1.20 | Ícone fixado permanece na barra de tarefas | | |
| 5.1.21 | Consumo de memória em regime (registrar valor: ______ MB) | | |
| 5.1.22 | Comportamento após 8 h sem interação | | |
| 5.1.23 | Notificação com a estação bloqueada (tela de bloqueio) | | |
| 5.1.24 | Comportamento com projetor/segundo monitor em modo duplicação | | |

**Registrar para cada NOK:** número do item, print da tela, versão do Edge, saída de `edge://policy/`, saída dos comandos da seção 2.4.

### 5.2 Limitações conhecidas — comunicar aos usuários piloto

Não são defeitos e não devem gerar chamado:

- **Chamada com o PWA totalmente encerrado:** se o usuário fechar o app e o Edge não estiver em segundo plano, a chamada não toca. Mitigado por 2.2.3 + `prevent_close` (3.4).
- **"Dar controle" durante compartilhamento de tela:** funcionalidade reduzida na versão web em relação ao cliente desktop.
- **Agendamento de reunião:** ocorre pelo Outlook Web; o suplemento do Outlook desktop não estará disponível no cenário web-first.
- **Primeira notificação após longa ociosidade:** pode ter atraso de alguns segundos enquanto o service worker é reativado.
- **Efeitos de plano de fundo:** disponíveis no Edge/Chrome; alguns recursos avançados de reunião permanecem exclusivos do cliente desktop.

---

## FASE 6 — Implantação geral

Executar **somente** após aprovação formal da Fase 5 pelo Gestor de TI.

| # | Ação |
|---|---|
| 6.1 | Aplicar as políticas da Fase 3 ao grupo de segurança de produção, em ondas de no máximo 25% do parque |
| 6.2 | Aguardar 48 h entre ondas, monitorando o volume de chamados |
| 6.3 | Comunicar previamente os usuários (o que muda, o que esperar, como abrir chamado) |
| 6.4 | Publicar guia rápido de 1 página ao usuário final |
| 6.5 | Treinar o Service Desk na matriz de troubleshooting (Seção 8) |
| 6.6 | Definir plano de reversão: remover `WebAppInstallForceList` e `WebAppSettings`, manter o restante |

---

## 7. Critérios de aceite do POP

A implantação é considerada bem-sucedida quando, **simultaneamente**:

1. 100% das estações piloto aprovadas em todos os itens marcados com ⚠.
2. `Notification.permission` retorna `"granted"` em todas as estações, sem intervenção manual.
3. `edge://policy/` apresenta as cinco políticas com status OK em todas as estações.
4. Latência de notificação inferior a 10 segundos em 95% dos testes.
5. Volume de chamados relacionados a notificação nas duas semanas seguintes à onda inferior a 5% dos usuários migrados.

---

## 8. Matriz de troubleshooting (Service Desk — N1)

| Sintoma | Verificar primeiro | Causa provável | Ação |
|---|---|---|---|
| Nenhuma notificação, nunca | `Notification.permission` no console | Permissão não concedida | Aplicar 2.2.1 ou verificar `NotificationsAllowedForUrls` em `edge://policy/` |
| `permission = "granted"` mas nada aparece | Configurações do Windows → Notificações | Camada 1 bloqueada | Aplicar 2.1.1 a 2.1.3 |
| Parou de notificar **em sala de reunião** | Não incomodar automático | "Ao duplicar a tela" ativo | Aplicar 2.1.4 |
| Notifica, mas com minutos de atraso | `edge://discards/` | Guia/PWA suspenso | Aplicar 2.2.4 / `SleepingTabsBlockedForUrls` |
| Para de notificar após fechar a janela | `edge://settings/system` | Execução em segundo plano desativada | Aplicar 2.2.3 / `BackgroundModeEnabled` |
| Para de notificar todo dia de manhã | Política de limpeza ao fechar | Service worker removido com os dados do site | Aplicar 2.2.5 |
| Notifica no chat, não em menção de canal | Teams → Notificações e atividade | Canal com notificação desativada | Revisar 2.3.4 e as configurações do canal |
| Notificação só dentro do Teams, não no Windows | Estilo de notificação | Definido como "Integrada ao Teams" | Aplicar 2.3.2 |
| Nada notifica para um usuário específico | Presença do usuário | Status "Não incomodar" ou "Apresentando" | Orientar o usuário (2.3.8) |
| Notificação funciona em casa, não na empresa | `Test-NetConnection client.wns.windows.com -Port 443` | Proxy bloqueando WNS | Escalar para Rede (Fase 4) |
| Áudio picotado em chamadas | Regras de UDP no firewall | UDP 3478–3481 bloqueado | Escalar para Rede (Fase 4) |
| PWA não instalou via política | `edge://policy/` + `edge://web-app-internals/` | `manifest_id` divergente | Corrigir 3.4 com o valor real |
| Teams não abre no logon | `edge://web-app-internals/` | `run_on_os_login` não aplicado | Verificar versão do Edge (≥ 116) e 3.4 |

**Escalonamento:** N1 → N2 (Analista de Suporte) após esgotar a matriz acima; N2 → Infraestrutura/Rede quando a causa for política ou conectividade; Infraestrutura → Suporte Microsoft quando reproduzível em estação sem políticas aplicadas.

---

## 9. Registro e evidências

Arquivar, por onda de implantação:

- Formulários de homologação da Fase 5 preenchidos e assinados.
- Exportação de `edge://policy/` de uma estação por onda.
- Registro da decisão da Fase 0 (SKU e justificativa).
- Relação de chamados abertos nos 15 dias seguintes, com classificação por linha da matriz da Seção 8.

## 10. Referências

- Microsoft Teams Progressive Web App — `learn.microsoft.com/microsoftteams/teams-progressive-web-apps`
- Microsoft Edge — Políticas do navegador — `learn.microsoft.com/deployedge/microsoft-edge-policies`
- Microsoft 365 URLs and IP address ranges — `learn.microsoft.com/microsoft-365/enterprise/urls-and-ip-address-ranges`
- Gerenciar notificações no Teams — `support.microsoft.com/teams`

## 11. Histórico de revisões

| Versão | Data | Alteração | Responsável |
|---|---|---|---|
| 1.0 | 13/08/2026 | Emissão inicial, derivada da Nota Técnica "Microsoft Teams Web como PWA em ambiente corporativo" | TI |

---

> **Observação de validação:** os caminhos de menu, políticas e chaves de registro descritos referem-se ao Microsoft Edge canal Stable e ao Windows 10 22H2 / Windows 11. Nenhum item deste POP foi executado no ambiente da empresa — a Fase 5 existe justamente para confirmá-los antes da adoção como padrão corporativo.
