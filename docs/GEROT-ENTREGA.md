# GEROT Entrega — planilha e cálculos

Fonte: `GEROT ENTREGA1.xlsx`, aba `GEROT 2026`, fornecida em 06/09/2026. A aba auxiliar `BASE_FOCO` não alimenta as fórmulas deste quadro e não foi importada.

O editor mantém a ordem das 133 linhas e as coordenadas dos meses O:Z. Inclui a linha 8 (dias úteis), as memórias sem nome nas linhas 36 e 37 e o acumulado N. O quadro de consulta continua com o layout existente. Somente Entrega utiliza o novo editor e interpretador.

As fórmulas são avaliadas a cada preenchimento, sem executar código da planilha. Células vazias, zero, texto vazio retornado por fórmula e erro são tratados separadamente. O acumulado usa a fórmula própria da coluna N: uma razão de totais não é substituída pela média das razões mensais. Nenhum resultado inválido reaproveita um valor antigo do Excel.

Correções autorizadas pela usuária:

- U:Z das linhas 114, 117, 120 e 126: a divisão passa a manter o numerador e denominador usados de janeiro a junho. Eram invertidos a partir de julho.
- N142: `IFERROR(AVERAGE(O142:Z142),"")`, incluindo novembro e dezembro no acumulado de absenteísmo.

As demais fórmulas são idênticas às da aba de origem. Uma célula mensal sem fórmula continua preenchível mesmo quando há fórmulas em outros meses da mesma linha. Isso inclui maio da linha 35 e agosto a dezembro das linhas 16 e 17. Os valores digitados e os indicadores adicionados anteriormente são preservados na migração; valores calculados antigos não são convertidos em entradas manuais.

Percentuais são digitados em escala humana (95 → 95%), números aceitam vírgula decimal e durações aceitam `hh:mm[:ss]`. O editor oferece busca, seleção de período, recolhimento de memórias, colagem retangular do Excel, desfazer/refazer, Enter/Tab, Ctrl+S e cancelamento com proteção contra perda de alterações.

O servidor compartilha somente as células alteradas. A validação inteira acontece antes da gravação, fórmulas são protegidas e o acesso de edição continua restrito ao setor Entrega e Gabriely. Armazenamento e bindings existentes são mantidos. O endpoint antigo de linhas continua disponível para navegadores já abertos.

Validação:

```text
npm run build
node --test tests/gerot-delivery.test.mjs tests/gerot-delivery-server.test.mjs
node tests/gerot-entrega.test.mjs
```

Os testes comparam os 587 resultados de fórmulas armazenados na planilha, verificam as 25 correções de fórmula autorizadas, recálculo com entradas alteradas, meses vazios, migração, permissões e gravações de sessões diferentes. A fixture contém somente as células N:Z do quadro, sem a aba de funcionários.

Para importar novamente o arquivo, instale opcionalmente `xlsx` e execute `node scripts/import-gerot-delivery.mjs caminho/arquivo.xlsx`. A fonte importada e a fixture são versionadas; o build e os testes não dependem de Excel ou desse pacote.
