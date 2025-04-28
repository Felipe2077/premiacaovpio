Ok, efetuei diversas correções e nossa parte administrativa ficou bem legal! ainda tem coisas que vamos definir, mas para o MVP está perfeito.
Agora sobre a tela inicial (a pública), acho que faltaram informações que para o pessoal mais conservador pode acabar fazendo falta.
Lembra da tela do powerBi? Ela tinha várias tabelas grandes e a tabela pequena de raking atual, vamos pensar nas tabelas grandes:
Tabela 1: exibe as metas de todos critérios de todas filiais.
Tabela 2: Exibe a quantidade das filiais nos critérios de avaliação.
Tabela 3: Exibe o percentual consumido da meta em %.
Tabela 4: Exibe a pontuação de cada filial naquele critério de avaliação.
O ponto é:Precisamos dar um jeito inteligente do ponto de vista de ui/ux de mostrar essas informações na tela e de forma menos "oculta" como um tooltip, acho o tooltip excelente e encorajo o uso e devemos manter e usar, porém não podemos deixar esse tipo de informação "na mão" dele, o pessoal que analisa essa tela inicial usa ela como estratégia para melhorar sua pontuação, então ela deve ser bem clara em: mostrar o raking atual, mostrar o desempenho da filial diante de suas metas.
Talvez se mesclarmos a tabela de meta de todos os critérios com a de percentual consumido da meta em %, já seria uma boa. Até penso em trazer além dos números uma informação visual (talvez com cor ou uma barra de progresso sutil) do quanto a filial consumiu de sua meta.
