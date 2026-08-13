# Padrão de documentos internos

Aplica-se a **notas técnicas**, **POPs** e **procedimentos** produzidos a partir de 13/08/2026.

## 1. Dois tipos de documento — não confundir

| | Nota Técnica (NT) | Procedimento Operacional Padrão (POP) |
|---|---|---|
| **Pergunta que responde** | "O que é isso e por que faríamos?" | "Como faz, e como sei que deu certo?" |
| **Modo verbal** | Descritivo — *"deverá ser avaliado"* | Imperativo — *"acesse X, clique em Y"* |
| **Público** | Quem decide | Quem executa |
| **Contém** | Contexto, solução proposta, riscos, referências | Passos numerados, comandos literais, critérios de aceite |
| **Sucesso** | A decisão é tomada | Duas pessoas diferentes executam e chegam ao mesmo resultado |

A NT é insumo do POP. Um POP escrito no modo verbal da NT não é executável.

## 2. Regras de escrita

1. **Cabeçalho de identificação em tabela.** Código, versão, data, área, classificação, origem, próxima revisão.
2. **Tabela em vez de prosa.** Se o conteúdo tem mais de três itens com o mesmo formato, é tabela.
3. **Todo passo tem resultado esperado.** Passo sem critério de verificação não é passo, é sugestão.
4. **Comando literal, copiável, em bloco de código.** Nunca "verifique as configurações" — sempre o caminho exato ou o comando exato.
5. **Numeração hierárquica estável** (`2.1.4`), para ser citada em chamado e em auditoria.
6. **Escopo e fora de escopo declarados.** O que o documento não cobre é tão importante quanto o que cobre.
7. **Critérios de aceite mensuráveis.** Número, percentual ou verificação binária — nunca "funcionando adequadamente".
8. **Matriz de troubleshooting** em POP de implantação: sintoma → o que verificar → causa provável → ação.
9. **Papéis explícitos.** Quem executa, quem aprova.
10. **Limitações conhecidas declaradas antes da implantação.** Evita chamado sobre comportamento esperado.
11. **O que não foi testado é dito.** Nunca apresentar como validado o que não foi executado no ambiente.
12. **Histórico de revisões ao final.**

## 3. Estrutura mínima de um POP

```
Cabeçalho de identificação
1. Objetivo (uma frase)
2. Escopo / Fora de escopo
3. Definições
4. Papéis e responsabilidades
5. Pré-requisitos (checklist)
Fase 0..N  — passos numerados, cada fase com sua verificação objetiva
Critérios de aceite
Matriz de troubleshooting + escalonamento
Registro e evidências
Referências
Histórico de revisões
```

## 4. Nomenclatura de arquivo

`POP-<AREA>-<NNN>-<assunto-em-kebab-case>.md` — ex.: `POP-TI-001-teams-pwa.md`
`NT-<AREA>-<NNN>-<assunto-em-kebab-case>.md`

Numeração sequencial por área, nunca reaproveitada.
