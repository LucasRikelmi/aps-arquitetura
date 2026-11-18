# Controle de autoria e revisão {#autoria}

Tabela 1 – Autoria e revisão dos itens de informação (regra 7). Fonte: elaborado pelos autores.

| Item | Artefato | Autor(a) | Revisor(a) |
|---|---|---|---|
| [1.1](#s1-1) | Visão geral e Figura 1 | Grazieli da Silva Macedo | André Barbosa Alancardete |
| [1.2](#s1-2) | Cliente: browser | Kamilly Benigno de Paula | Lucas Rikelmi Macedo da Silva |
| [1.3](#s1-3) | Rede: DNS, TCP e TLS | Kamilly Benigno de Paula | Lucas Rikelmi Macedo da Silva |
| [1.4](#s1-4) | Servidor web | Kamilly Benigno de Paula | Lucas Rikelmi Macedo da Silva |
| [1.5](#s1-5) | Servidor de aplicação | Grazieli da Silva Macedo | Lucas Rikelmi Macedo da Silva |
| [1.6](#s1-6) | SGBD | Kamilly Benigno de Paula | Lucas Rikelmi Macedo da Silva |
| [1.7](#s1-7) | Ciclo da requisição e Figura 2 | Lucas Rikelmi Macedo da Silva | Lucas Rikelmi Macedo da Silva |
| [2.1](#s2-1) | Requisitos e escopo | André Barbosa Alancardete | Lucas Rikelmi Macedo da Silva |
| [2.2](#s2-2) | Decisões arquiteturais | André Barbosa Alancardete | Lucas Rikelmi Macedo da Silva |
| [2.3](#s2-3) | Contexto e Figura 3 | André Barbosa Alancardete | Lucas Rikelmi Macedo da Silva |
| [2.4](#s2-4) | Componentes e Figura 4 | Kamilly Benigno de Paula | Lucas Rikelmi Macedo da Silva |
| [2.5](#s2-5) | Contrato da API | Grazieli da Silva Macedo | Lucas Rikelmi Macedo da Silva |
| [2.6](#s2-6) | Modelo de dados e Figura 5 | Kamilly Benigno de Paula | Lucas Rikelmi Macedo da Silva |
| [2.7](#s2-7) | Desenho detalhado, Figuras 6 a 9 | André Barbosa Alancardete | Lucas Rikelmi Macedo da Silva |
| [2.8](#s2-8) | Segurança e tratamento de erros | André Barbosa Alancardete | Lucas Rikelmi Macedo da Silva |
| [Referências](#refs) | Referências (G6) | Lucas Rikelmi Macedo da Silva | Lucas Rikelmi Macedo da Silva |
| [Apêndice I](#ap1) | Registro de IA (G5) | Grazieli da Silva Macedo | Lucas Rikelmi Macedo da Silva |
| [Apêndice II](#ap2) | Atas e registros (G3) | Lucas Rikelmi Macedo da Silva | Lucas Rikelmi Macedo da Silva |


# 1 Ambiente operacional da aplicação Web {#s1}


## 1.1 Visão geral e pilha adotada {#s1-1}

::: autoria-item
Autor(a): Grazieli da Silva Macedo · Revisor(a): André Barbosa Alancardete
:::

A pilha tecnológica adotada é composta por **Nginx**, como servidor web e proxy reverso; **Node.js com Express**, como servidor de aplicação; e **PostgreSQL**, como sistema gerenciador de banco de dados. O ambiente operacional também envolve o **navegador**, que executa HTML e JavaScript no computador do usuário, e o **serviço DNS**, que resolve o nome do servidor. Esses dois componentes externos não integram a pilha de execução no servidor. A Figura 1 representa a implantação proposta em um host Linux e as comunicações entre os componentes. A mesma pilha é usada no projeto da Seção 2, cujos componentes internos são detalhados no item 2.4.

![Figura 1 – Implantação proposta do ambiente operacional](file:///home/claude/aps-arquitetura/aps/diagramas/fig01-implantacao.svg)

Figura 1 – Implantação proposta do ambiente operacional da aplicação web. Fonte: elaborado pelos autores, com base na documentação técnica citada neste item.

A conexão externa, entre o navegador e o Nginx, usa HTTP/1.1 sobre TLS 1.3, na porta 443 (FIELDING; NOTTINGHAM; RESCHKE, 2022). O HTTP/2 não é habilitado: no Nginx, a diretiva `http2` tem valor padrão `off`, e a negociação de protocolo na conexão TLS resulta em HTTP/1.1 (NGINX, [20--]). O encaminhamento do Nginx ao Express ocorre por HTTP na interface de loopback do mesmo host e não usa TLS, como estabelece o RNF01 do item 2.1.

### Justificativa da escolha

O primeiro critério para a escolha é a **disponibilidade de documentação técnica**. Nginx, Node.js, Express e PostgreSQL oferecem documentação oficial pública sobre configuração, processamento de requisições, roteamento e acesso a dados (NGINX, [20--]; NODE.JS, [20--]; EXPRESS, [20--]; POSTGRESQL GLOBAL DEVELOPMENT GROUP, [20--]). Essa disponibilidade facilita a consulta e a manutenção do ambiente, sem implicar uma alegação de desempenho superior ou de maior adoção de mercado.

O segundo critério é a **separação de responsabilidades**. O Nginx atende as conexões externas, entrega os arquivos estáticos e encaminha as chamadas `/api/*` ao servidor de aplicação; o Express organiza o tratamento das requisições, enquanto o PostgreSQL mantém os dados (NGINX, [20--]; EXPRESS, [20--]; POSTGRESQL GLOBAL DEVELOPMENT GROUP, [20--]). Essa divisão torna explícito o papel de cada componente e favorece a manutenção. **Não representa escalabilidade independente nesta implantação**, porque Nginx e Node.js compartilham os recursos do mesmo host. As decisões que decorrem dessa divisão estão registradas no item 2.2.

Como contraponto, o processamento de operações intensivas em CPU pode prejudicar a capacidade de resposta do Node.js quando ocupa o laço de eventos principal (NODE.JS, [20--]). Na arquitetura proposta, a verificação de senhas com **Argon2id ocorre fora da thread principal**, em operação assíncrona, com biblioteca e parâmetros descritos no item 1.5. O cálculo continua consumindo CPU e memória, de modo que a concorrência de autenticações permanece limitada pelos recursos disponíveis. O limite de taxa do RNF05 (item 2.1) e a análise de ameaças do item 2.8 tratam esse risco. Essa limitação da pilha não constitui uma medição de desempenho da aplicação.


## 1.2 Cliente: browser {#s1-2}

::: autoria-item
Autor(a): Kamilly Benigno de Paula · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

### Funcionamento do navegador Web

Os navegadores Web funcionam dentro da arquitetura cliente-servidor, na qual o cliente realiza solicitações de recursos e o servidor responde de acordo com as requisições recebidas. Nesse contexto, o navegador é um aplicativo utilizado para acessar, recuperar, interpretar e exibir conteúdos disponíveis na World Wide Web, como páginas HTML, imagens, vídeos e outros arquivos.

A comunicação entre o navegador e o servidor ocorre por meio do protocolo HTTP (Hypertext Transfer Protocol), responsável por definir a estrutura das requisições e respostas utilizadas na transferência de informações pela Web. Neste projeto, será utilizado o HTTP/1.1 sobre uma conexão protegida por TLS 1.3.

### Acesso à aplicação por meio de uma URL

Quando o usuário acessa o endereço da aplicação, o navegador identifica o domínio e estabelece a comunicação com o servidor responsável pelo conteúdo solicitado. A resolução do domínio em endereço IP ocorre por meio do DNS, conforme explicado no item 1.3.

Após localizar o servidor e estabelecer a conexão segura, o navegador pode solicitar os recursos necessários para apresentar a aplicação ao usuário.

### Interpretação de HTML e construção do DOM

Ao receber um documento HTML, o navegador realiza sua interpretação e constrói o DOM (Document Object Model), uma representação estruturada do documento que permite acessar e manipular seus elementos.

Durante esse processo, também são processados recursos associados à página, como folhas de estilo CSS e scripts JavaScript. O CSS define a apresentação visual dos elementos, enquanto o JavaScript permite adicionar funcionalidades e interatividade à aplicação.

### JavaScript e API Fetch

O JavaScript permite executar funcionalidades no navegador e responder às ações realizadas pelo usuário. Por meio da API Fetch, os scripts podem realizar requisições HTTP de forma assíncrona, permitindo enviar e receber dados sem necessariamente recarregar toda a página.

Na aplicação desenvolvida, esse mecanismo será utilizado no processo de autenticação. Quando o usuário preencher o formulário de login e enviar suas credenciais, o JavaScript utilizará a função `fetch()` para realizar uma requisição do tipo POST ao endpoint `/api/auth/login`.

O corpo da requisição será enviado no formato JSON, contendo o identificador e a senha informados pelo usuário. Dessa maneira, os dados serão encaminhados ao servidor de aplicação para que as credenciais sejam verificadas.

### Estrutura da requisição HTTP

A comunicação utilizará HTTP/1.1 sobre TLS 1.3. Uma requisição HTTP/1.1 possui uma linha inicial, cabeçalhos e, quando necessário, um corpo com os dados enviados ao servidor.

No processo de login, a requisição terá a seguinte estrutura ilustrativa:

```http
POST /api/auth/login HTTP/1.1
Host: exemplo.com
Content-Type: application/json

{
  "identificador": "usuario",
  "senha": "senha_informada"
}
```

A linha inicial informa o método HTTP, o caminho do recurso solicitado e a versão do protocolo. O método POST é utilizado porque a aplicação precisa enviar informações ao servidor.

O cabeçalho `Host` identifica o domínio ao qual a requisição se destina, enquanto `Content-Type: application/json` informa que o corpo da mensagem está no formato JSON. O corpo contém o identificador e a senha fornecidos pelo usuário.

A comunicação entre navegador e servidor será protegida por HTTPS, utilizando TLS 1.3, conforme descrito no item 1.3.

### Tratamento da resposta HTTP

Após receber a requisição, o servidor processa as informações e retorna uma resposta HTTP. Essa resposta contém uma linha de status, cabeçalhos e, quando aplicável, um corpo com os dados ou mensagens retornadas pela aplicação.

No processo de autenticação, os principais códigos de resposta previstos são:

- **200 OK:** indica que a autenticação foi realizada com sucesso. A resposta contém a identificação do usuário, conforme o contrato da API.
- **400 Bad Request:** indica que a requisição apresenta dados inválidos ou está incompleta.
- **401 Unauthorized:** indica que as credenciais informadas não são válidas.
- **413 Content Too Large:** indica que o corpo da requisição ultrapassou o tamanho máximo aceito pelo servidor web, conforme o item 1.4.
- **429 Too Many Requests:** indica que o limite de requisições permitido foi excedido.

O JavaScript pode analisar o código de status e o conteúdo retornado pelo servidor para apresentar a informação adequada ao usuário. Em caso de sucesso, a aplicação poderá utilizar a identificação recebida. Em caso de erro, poderá apresentar uma mensagem correspondente à situação.

Dessa forma, o navegador atua como intermediário entre o usuário e os serviços disponibilizados pelo servidor, sendo responsável por apresentar a interface, executar scripts, enviar requisições HTTP e interpretar as respostas recebidas.

### Fontes

- FIELDING, R.; NOTTINGHAM, M.; RESCHKE, J. (ed.). *HTTP Semantics*. RFC 9110. [S. l.]: IETF, jun. 2022. Disponível em: https://www.rfc-editor.org/rfc/rfc9110. Acesso em: 17 nov. 2026.
- MOZILLA. *Document Object Model (DOM)*. MDN Web Docs. [20--]. Disponível em: https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model. Acesso em: 17 nov. 2026.
- MOZILLA. *HTML: HyperText Markup Language*. MDN Web Docs. [20--]. Disponível em: https://developer.mozilla.org/en-US/docs/Web/HTML. Acesso em: 17 nov. 2026.
- MOZILLA. *Using the Fetch API*. MDN Web Docs. [20--]. Disponível em: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch. Acesso em: 17 nov. 2026.


## 1.3 Rede: DNS, TCP e TLS {#s1-3}

::: autoria-item
Autor(a): Kamilly Benigno de Paula · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

### Resolução DNS

O Domain Name System (DNS), ou Sistema de Nomes de Domínio, funciona como uma espécie de lista telefônica da Internet. Os usuários acessam sites por meio de nomes de domínio, como `google.com` ou `youtube.com`, enquanto a comunicação entre dispositivos utiliza endereços IP.

O DNS é responsável por traduzir os nomes de domínio em endereços IP correspondentes, permitindo que os navegadores localizem os servidores responsáveis pelos recursos solicitados.

Quando o navegador precisa localizar um domínio e não possui uma resposta válida em cache, a consulta pode passar por diferentes níveis da hierarquia DNS. Inicialmente, o resolvedor consulta um servidor raiz, que indica onde encontrar os servidores responsáveis pela extensão do domínio, como `.com` ou `.br`. Em seguida, consulta um servidor TLD (Top-Level Domain), que indica os servidores autoritativos responsáveis pelo domínio. Por fim, o servidor autoritativo fornece o registro correspondente, como um registro A, utilizado para endereços IPv4, ou AAAA, utilizado para endereços IPv6.

A resposta é devolvida ao resolvedor e pode ser armazenada temporariamente em cache, de acordo com seu tempo de vida (TTL). Isso reduz a necessidade de repetir consultas e pode acelerar acessos posteriores ao mesmo domínio.

### Endereçamento IP e protocolo TCP

O Internet Protocol (IP), ou Protocolo de Internet, é responsável pelo endereçamento e encaminhamento de pacotes de dados entre dispositivos conectados à rede. Ele permite identificar a origem e o destino das informações, possibilitando que os pacotes sejam encaminhados até o dispositivo de destino.

Entretanto, o IP não garante que os pacotes cheguem corretamente, nem que sejam recebidos na ordem em que foram enviados. Para oferecer confiabilidade na transmissão, utiliza-se frequentemente o Transmission Control Protocol (TCP), ou Protocolo de Controle de Transmissão.

O TCP estabelece uma conexão entre os dispositivos antes da transmissão dos dados e oferece mecanismos para garantir a entrega ordenada e confiável das informações. Caso algum segmento seja perdido, o protocolo utiliza mecanismos de retransmissão para tentar garantir sua entrega.

Uma forma de compreender essa relação é imaginar o envio de um quebra-cabeça pelo correio: o IP é responsável por encaminhar as peças até o destino, enquanto o TCP organiza as peças na sequência correta e verifica se todas foram recebidas. Dessa maneira, os dois protocolos trabalham em conjunto para permitir a comunicação entre dispositivos na Internet.

### Estabelecimento da conexão TCP

O estabelecimento de uma conexão TCP ocorre por meio de um processo conhecido como three-way handshake, composto por três etapas.

1. **SYN:** o cliente envia um segmento SYN ao servidor, solicitando o início da conexão.
2. **SYN-ACK:** o servidor responde com um segmento SYN-ACK, confirmando o recebimento da solicitação e indicando que também está preparado para estabelecer a conexão.
3. **ACK:** o cliente envia um segmento ACK, confirmando o recebimento da resposta do servidor.

Após essas três etapas, a conexão TCP está estabelecida e os dados podem ser transmitidos.

No contexto da aplicação, esse processo ocorre entre o navegador e o servidor Web, utilizando a porta 443, convencionalmente destinada às conexões HTTPS.

### Protocolo TLS 1.3

O Transport Layer Security (TLS) é um protocolo criptográfico utilizado para proteger a comunicação entre aplicações cliente e servidor. Seu objetivo é garantir a confidencialidade e a integridade dos dados transmitidos, além de permitir a autenticação do servidor.

O estabelecimento de uma conexão protegida ocorre por meio de um processo chamado handshake TLS. Durante esse procedimento, cliente e servidor negociam os parâmetros criptográficos da comunicação, realizam a autenticação do servidor por meio de seu certificado digital e estabelecem as chaves de sessão utilizadas para proteger a transmissão dos dados.

Na versão TLS 1.3, o handshake completo normalmente ocorre em uma ida e volta de comunicação (1-RTT), desde que os parâmetros sejam compatíveis e não seja necessário um procedimento adicional de negociação.

O processo ocorre da seguinte maneira:

1. **ClientHello:** o cliente envia uma mensagem informando os parâmetros criptográficos que suporta. Ela inclui a extensão `key_share`, que apresenta os dados necessários para o estabelecimento das chaves compartilhadas.
2. **ServerHello:** o servidor responde selecionando os parâmetros da comunicação e enviando sua própria informação `key_share`, permitindo que cliente e servidor estabeleçam o segredo compartilhado.
3. **EncryptedExtensions:** o servidor envia extensões adicionais negociadas para a conexão.
4. **Certificate:** o servidor apresenta seu certificado digital, que contém informações sobre sua identidade e sua chave pública.
5. **CertificateVerify:** o servidor comprova que possui a chave privada correspondente ao certificado, assinando informações relacionadas ao handshake.
6. **Finished:** o servidor envia uma mensagem que permite verificar a integridade do processo de negociação. O cliente também envia sua mensagem Finished para concluir o handshake.

O navegador verifica o certificado digital, incluindo sua validade, a correspondência com o domínio acessado e a cadeia de certificação até uma autoridade certificadora confiável. Caso a validação falhe, o navegador poderá apresentar um alerta e não estabelecer a conexão como confiável.

Após a conclusão do handshake, cliente e servidor utilizam as chaves de sessão estabelecidas para proteger os dados transmitidos. Essas etapas são definidas pela especificação TLS 1.3, descrita na RFC 8446.

### HTTPS e sua importância na aplicação

O Hypertext Transfer Protocol Secure (HTTPS) é a utilização do protocolo HTTP sobre uma conexão protegida pelo Transport Layer Security (TLS). Ele permite que os dados transmitidos entre o navegador e o servidor sejam protegidos por criptografia, garantindo a confidencialidade e a integridade das informações, além de possibilitar a autenticação do servidor por meio de certificados digitais.

No contexto da aplicação desenvolvida, o uso de HTTPS é obrigatório porque o processo de autenticação transmite a senha do usuário no corpo de uma requisição HTTP. Sem uma conexão protegida por TLS, essas informações poderiam ficar expostas à interceptação ou alteração durante a transmissão.

Além disso, o HTTPS permite que o navegador verifique a identidade do servidor por meio de seu certificado digital, contribuindo para a segurança e a confiabilidade da aplicação.

Dessa forma, a utilização de HTTP/1.1 sobre TLS 1.3 protege a comunicação entre o navegador e o servidor Web durante o envio das credenciais e das demais informações da aplicação.

### Fontes

- CLOUDFLARE. *O que é DNS?* [20--]. Disponível em: https://www.cloudflare.com/pt-br/learning/dns/what-is-dns. Acesso em: 17 nov. 2026.
- CLOUDFLARE. *What happens in a TLS handshake?* [20--]. Disponível em: https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake. Acesso em: 17 nov. 2026.
- CLOUDFLARE. *What is TCP/IP?* [20--]. Disponível em: https://www.cloudflare.com/learning/ddos/glossary/tcp-ip. Acesso em: 17 nov. 2026.
- MOZILLA. *HTTPS*. MDN Web Docs. [20--]. Disponível em: https://developer.mozilla.org/pt-BR/docs/Glossary/HTTPS. Acesso em: 17 nov. 2026.
- RESCORLA, E. *The Transport Layer Security (TLS) Protocol Version 1.3*. RFC 8446. [S. l.]: IETF, ago. 2018. Disponível em: https://www.rfc-editor.org/rfc/rfc8446. Acesso em: 17 nov. 2026.


## 1.4 Servidor web: Nginx {#s1-4}

::: autoria-item
Autor(a): Kamilly Benigno de Paula · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

### Funcionamento do Nginx

O Nginx é um servidor Web utilizado para receber e processar requisições HTTP e HTTPS realizadas pelos clientes, como os navegadores. Ele também pode atuar como proxy reverso, encaminhando as requisições recebidas para servidores de aplicação responsáveis pelo processamento das funcionalidades do sistema.

Além disso, o Nginx pode disponibilizar arquivos estáticos, como imagens, arquivos HTML, CSS e JavaScript, diretamente aos clientes, sem precisar encaminhar essas solicitações para a aplicação. Dessa forma, ele contribui para a organização da infraestrutura e para a distribuição eficiente das requisições recebidas pelo sistema.

### Processos master e workers

O Nginx utiliza uma arquitetura baseada em processos, composta principalmente por um processo master e vários processos workers.

O processo master é responsável por ler e interpretar os arquivos de configuração, gerenciar os processos workers e controlar o funcionamento do servidor. Ele também pode iniciar, encerrar ou reiniciar os workers quando necessário.

Os processos workers são responsáveis por atender e processar as requisições recebidas dos clientes. Eles utilizam um modelo orientado a eventos, permitindo lidar com várias conexões simultaneamente sem precisar criar um processo separado para cada requisição.

Essa divisão permite que o Nginx distribua o processamento entre diferentes workers, aproveitando os recursos disponíveis no servidor e atendendo múltiplas conexões de maneira eficiente.

### Porta 443 e terminação TLS

A porta 443 é utilizada convencionalmente para receber conexões HTTPS. No Nginx, essa porta pode ser configurada por meio da diretiva `listen 443 ssl`, indicando que o servidor deve aceitar conexões protegidas por TLS.

Neste projeto, a comunicação segura utiliza TLS 1.3, conforme definido no item 1.3. Para isso, o Nginx deve ser configurado com um certificado digital e sua respectiva chave privada.

A terminação TLS é o processo em que o Nginx recebe uma conexão HTTPS e realiza o processamento da camada de criptografia da comunicação. Depois de receber os dados protegidos, o Nginx pode processar a requisição ou encaminhá-la para a aplicação.

Em uma arquitetura com proxy reverso, a comunicação entre o Nginx e a aplicação pode ocorrer por uma conexão interna HTTP, desde que essa configuração seja adequada ao ambiente e às exigências de segurança. Assim, a comunicação externa permanece protegida por HTTPS, enquanto o Nginx atua como intermediário entre o navegador e a aplicação.

### Disponibilização de arquivos estáticos

Arquivos estáticos são recursos cujo conteúdo não precisa ser gerado dinamicamente pela aplicação a cada requisição. Alguns exemplos são arquivos HTML, CSS, JavaScript, imagens e fontes utilizadas pelo sistema.

O Nginx pode disponibilizar esses arquivos diretamente ao navegador, utilizando diretivas como `root` e `location` para identificar os caminhos e diretórios onde os recursos estão armazenados.

Dessa maneira, quando o navegador solicita um arquivo estático, o Nginx pode localizar o recurso e enviá-lo diretamente ao cliente, reduzindo o trabalho do servidor de aplicação e evitando processamento desnecessário.

### Encaminhamento de requisições com proxy_pass

A diretiva `proxy_pass` é utilizada no Nginx para encaminhar requisições recebidas para outro servidor, geralmente uma aplicação responsável pelo processamento das funcionalidades do sistema.

Em uma arquitetura que utiliza Node.js com Express, por exemplo, o Nginx pode receber uma requisição HTTPS na porta 443 e encaminhá-la para a aplicação executada internamente na porta 3000.

Nesse cenário, o Nginx atua como proxy reverso, recebendo as requisições externas e direcionando-as ao servidor de aplicação. Após o processamento, a resposta retorna ao Nginx, que a encaminha ao navegador do usuário.

Para preservar informações da requisição original, podem ser utilizados cabeçalhos como `Host` e `X-Forwarded-For`. O primeiro encaminha o domínio solicitado pelo cliente, enquanto o segundo permite informar os endereços IP envolvidos no encaminhamento da requisição.

### Limite de tamanho das requisições

O Nginx permite configurar limites para o tamanho do corpo das requisições recebidas dos clientes. Essa configuração é importante para evitar que solicitações excessivamente grandes consumam recursos desnecessários do servidor.

Para estabelecer esse limite, pode ser utilizada a diretiva `client_max_body_size`, que define o tamanho máximo permitido para o corpo de uma requisição.

Como o endpoint de login recebe apenas informações pequenas, como identificador e senha, o exemplo de configuração utiliza o limite de `1k`. Caso o cliente envie uma requisição com tamanho superior ao permitido, o Nginx rejeita a solicitação e retorna o código HTTP 413 (Content Too Large).

### Limitação da taxa de requisições

O Nginx também permite limitar a quantidade de requisições recebidas em determinado intervalo de tempo. Esse mecanismo é conhecido como limitação de taxa de requisições (rate limiting).

Para realizar esse controle, pode ser utilizado o módulo `ngx_http_limit_req_module`, que permite definir uma taxa de solicitações considerando uma chave de identificação, como o endereço IP do cliente.

Neste projeto, a limitação é aplicada especificamente ao endpoint `/api/auth/login`, utilizando o endereço IP como referência. O parâmetro `rate` define a taxa média permitida, enquanto `burst` estabelece uma quantidade de solicitações excedentes que podem ser acomodadas temporariamente. O parâmetro `nodelay` permite encaminhar essas solicitações excedentes sem atraso, dentro do limite configurado.

Quando o limite é ultrapassado, as solicitações excedentes podem ser rejeitadas. Por padrão, o módulo `limit_req` utiliza o código HTTP 503 para essas rejeições. Para que a aplicação retorne HTTP 429 (Too Many Requests), é necessário configurar a diretiva `limit_req_status 429`.

Esse mecanismo contribui para reduzir abusos, controlar o volume de solicitações e proteger os recursos do servidor, especialmente no endpoint de autenticação.

### Exemplo de configuração do Nginx

O exemplo a seguir demonstra uma configuração ilustrativa do Nginx utilizando HTTPS com TLS 1.3, redirecionamento da porta 80 para a 443, disponibilização de arquivos estáticos, encaminhamento de requisições para uma aplicação e limitação de tamanho e taxa de requisições.

```nginx
http {
    limit_req_zone $binary_remote_addr
        zone=login_limit:10m rate=10r/m;

    server {
        listen 80;
        server_name exemplo.com;

        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name exemplo.com;

        ssl_protocols TLSv1.3;
        ssl_certificate /caminho/certificado.crt;
        ssl_certificate_key /caminho/chave-privada.key;

        client_max_body_size 1k;

        error_page 429 = @rate_limit_json;

        location / {
            root /var/www/html;
            index index.html;
        }

        location = /api/auth/login {
            limit_req zone=login_limit
                burst=10 nodelay;

            limit_req_status 429;

            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For
                $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_pass http://127.0.0.1:3000;
        }

        location /api/ {
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For
                $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_pass http://127.0.0.1:3000;
        }

        location @rate_limit_json {
            default_type application/json;
            return 429 '{"erro":"Muitas requisicoes. Tente novamente mais tarde."}';
        }
    }
}
```

Nesse exemplo, o Nginx recebe inicialmente as conexões HTTP na porta 80 e redireciona os clientes para HTTPS na porta 443. A comunicação segura utiliza TLS 1.3, com o certificado digital e a chave privada configurados.

As solicitações de arquivos estáticos são atendidas diretamente pelo Nginx, enquanto as requisições destinadas à API são encaminhadas para a aplicação executada localmente na porta 3000.

A diretiva `client_max_body_size 1k` estabelece o limite de 1 kilobyte para o corpo das requisições. Já o módulo `limit_req` controla a taxa de solicitações direcionadas especificamente ao endpoint `/api/auth/login`, utilizando o endereço IP do cliente como referência.

A taxa de `10r/m` (10 requisições por minuto por IP) e o limite `burst=10` seguem o RNF05, definido no item 2.1. O valor permite o uso normal mesmo quando vários usuários compartilham o mesmo IP, como em uma rede de universidade, e ainda torna lenta uma tentativa de força bruta a partir de uma única origem. O limite de tentativas por conta fica fora do escopo, conforme a premissa P04 do item 2.1. A diretiva `limit_req_status 429` configura o código de resposta para as solicitações rejeitadas por excesso de requisições.

A configuração `error_page 429` permite apresentar uma resposta no formato JSON quando o limite de taxa é ultrapassado. Os cabeçalhos `Host`, `X-Forwarded-For` e `X-Forwarded-Proto` encaminham informações da requisição original para a aplicação.

O exemplo é ilustrativo e deve ser adaptado aos caminhos, certificados, endereços, limites e demais parâmetros definidos na implementação do projeto.

### Fontes

- NGINX. *Beginner's Guide*. [20--]. Disponível em: https://nginx.org/en/docs/beginners_guide.html. Acesso em: 17 nov. 2026.
- NGINX. *Configuring HTTPS servers*. [20--]. Disponível em: https://nginx.org/en/docs/http/configuring_https_servers.html. Acesso em: 17 nov. 2026.
- NGINX. *Module ngx_http_core_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_core_module.html. Acesso em: 17 nov. 2026.
- NGINX. *Module ngx_http_limit_req_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html. Acesso em: 17 nov. 2026.
- NGINX. *Module ngx_http_proxy_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_proxy_module.html. Acesso em: 17 nov. 2026.


## 1.5 Servidor de aplicação: Node.js/Express {#s1-5}

::: autoria-item
Autor(a): Grazieli da Silva Macedo · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

Um servidor de aplicação é um software ou serviço que fornece um ambiente para a execução de aplicações, incluindo aplicações distribuídas, acessíveis aos clientes por meio de uma rede. Seu objetivo é oferecer recursos de infraestrutura que simplifiquem o desenvolvimento e a operação da aplicação, permitindo que o desenvolvedor se concentre na lógica de negócios.

### Características

Dependendo da implementação e da arquitetura adotadas, esse ambiente pode oferecer ou integrar os seguintes recursos:

- **Tolerância a falhas:** utilização de redundância e mecanismos de recuperação para manter o serviço disponível quando algum componente falha.
- **Balanceamento de carga:** distribuição das requisições entre diferentes instâncias da aplicação, contribuindo para a escalabilidade e o desempenho.
- **Gerenciamento de serviços:** recursos para administrar sessões, autenticação, notificações e componentes da aplicação.
- **Suporte a transações:** mecanismos para preservar a integridade das operações, conforme os recursos dos bancos de dados e da aplicação. Transações que envolvem diferentes bancos podem exigir coordenação distribuída.

Esses recursos dependem da arquitetura e das configurações adotadas e não são garantias automáticas do uso de Node.js e Express.

### Node.js e Express

Neste projeto, a camada de aplicação será implementada com Node.js e Express. O Node.js é um ambiente de execução de JavaScript que permite desenvolver servidores e aplicações de rede. Seu modelo de entrada e saída assíncrona permite processar outras requisições enquanto operações, como consultas ao banco de dados, aguardam resultados, desde que sejam utilizadas APIs não bloqueantes (NODE.JS, [20--]).

O Express é um framework web minimalista executado sobre o Node.js. Ele fornece recursos de roteamento e permite compor o processamento das requisições HTTP por meio de funções chamadas middlewares. Essas funções normalmente recebem três argumentos:

- `req`: objeto que representa a requisição HTTP;
- `res`: objeto utilizado para construir e enviar a resposta HTTP;
- `next`: função que transfere o controle ao próximo middleware.

Os middlewares podem executar código, modificar os objetos de requisição e resposta, encerrar o processamento ou encaminhar o controle. Eles são registrados por métodos como `app.use()` e executados na ordem de registro, conforme as condições de correspondência. Middlewares de tratamento de erros recebem quatro argumentos: `err`, `req`, `res` e `next` (EXPRESS, [20--]).

Há recursos nativos e bibliotecas adicionais para interpretar corpos JSON e dados de formulários, manipular cookies, gerenciar sessões, autenticar usuários e configurar cabeçalhos de segurança. Entre os recursos nativos está `express.json()`, responsável por interpretar o corpo das requisições com conteúdo JSON. A validação dos dados não é realizada pelo Express e deverá ser implementada pela aplicação ou por uma biblioteca específica (EXPRESS, [20--]).

O Express permite associar funções a caminhos e métodos HTTP, como `GET` e `POST`, por meio de métodos como `app.get()` e `app.post()`. Essas funções são os tratadores das rotas e executam o processamento correspondente à operação solicitada (EXPRESS, [20--]).

### Invocação e processamento no projeto

O processo Node.js será iniciado e supervisionado por um gerenciador de processos, como PM2 ou systemd. A aplicação será configurada para escutar apenas no endereço local `127.0.0.1`, na porta `3000`, por meio de `app.listen(3000, '127.0.0.1')`. As requisições HTTP serão encaminhadas pelo Nginx, que atuará como proxy reverso no mesmo host ou no mesmo namespace de rede, caso sejam utilizados contêineres.

Ao receber uma requisição, o servidor HTTP do Node.js aciona o Express, enquanto o laço de eventos (event loop) coordena a execução dos callbacks. No fluxo previsto, o middleware `express.json()` interpreta o corpo JSON e o Express encaminha a requisição ao tratador da rota `POST /api/auth/login`, o método `login(req, res)` do `AuthController`. O controlador valida o formato da requisição, os campos obrigatórios e o comprimento dos valores. Com a entrada válida, o controlador chama o `AuthenticationService`, que executa a lógica de autenticação (NODE.JS, [20--]; EXPRESS, [20--]).

O `PgUserRepository` consulta o PostgreSQL por meio de APIs assíncronas do driver, permitindo que o laço de eventos processe outros eventos enquanto aguarda os resultados. Entretanto, operações como `JSON.parse()` e validações implementadas com código síncrono ocupam a thread principal durante sua execução. Por isso, o tamanho das entradas e o custo computacional dessas operações devem ser controlados (NODE.JS, [20--]).

O middleware `express.json()` permite limitar o tamanho do corpo da requisição por meio da opção `limit`, cujo valor padrão é `'100kb'`. Esse limite ajuda a restringir o volume de dados submetido à interpretação, mas não elimina o custo do processamento síncrono (EXPRESS, [20--]).

No projeto, o Nginx aplica o limite de **1 KiB** estabelecido pelo RNF06 do item 2.1, com a diretiva `client_max_body_size 1k` descrita no item 1.4. Quando o corpo ultrapassa esse limite, o Nginx retorna `413` antes que a requisição chegue ao Express.

### Resultado gerado

O processamento no Express produz uma resposta HTTP composta por código de status, cabeçalhos e corpo JSON. O `AuthController` constrói a resposta da rota com o objeto `res`, utilizando métodos como `res.status()`, `res.set()` e `res.json()`. O Nginx encaminha essa resposta ao cliente (EXPRESS, [20--]).

O Nginx gera diretamente as respostas `413` e `429` ao aplicar os limites de tamanho e de taxa. O exemplo do item 1.4 define um corpo JSON para a resposta `429`.

### Processamento do Argon2id

Para a implementação do Argon2id, propõe-se utilizar o pacote `argon2`, do projeto `node-argon2`. A documentação da biblioteca apresenta as funções assíncronas `hash()` e `verify()` para gerar hashes e verificar senhas, respectivamente, e identifica o Argon2id como a variante padrão (RANISALT, [20--]).

Na verificação de senhas do projeto, a função `verify()` recebe o hash armazenado em formato PHC, que contém o salt e os parâmetros do cálculo, conforme a premissa P01. O RNF02 do item 2.1 estabelece como parâmetros mínimos **19 MiB de memória, 2 iterações e paralelismo 1**.

O cálculo do Argon2id exige recursos de CPU e memória. Na implementação consultada, o cálculo nativo utiliza `Napi::AsyncWorker`, cujo método `Execute()` roda em uma thread de trabalho da libuv, fora da thread principal. A entrega do resultado à aplicação ocorre posteriormente na thread principal (RANISALT, [20--]; NODE.JS, [20--]).

Como o pool de trabalho é compartilhado e possui capacidade limitada, tarefas podem aguardar na fila até que uma thread esteja disponível. Portanto, executar o cálculo fora da thread principal evita seu bloqueio direto, mas não elimina os limites de processamento do servidor (NODE.JS, [20--]).

### Fontes

- EXPRESS. *Express Object*. [20--]. Disponível em: https://expressjs.com/en/api/express/. Acesso em: 17 nov. 2026.
- EXPRESS. *Response*. [20--]. Disponível em: https://expressjs.com/en/api/response/. Acesso em: 17 nov. 2026.
- EXPRESS. *Routing*. [20--]. Disponível em: https://expressjs.com/en/guide/routing/. Acesso em: 17 nov. 2026.
- EXPRESS. *Using middleware*. [20--]. Disponível em: https://expressjs.com/en/guide/using-middleware/. Acesso em: 17 nov. 2026.
- NODE.JS. *AsyncWorker*. In: node-addon-api. [20--]. Disponível em: https://github.com/nodejs/node-addon-api/blob/main/doc/async_worker.md. Acesso em: 17 nov. 2026.
- NODE.JS. *Don't Block the Event Loop (or the Worker Pool)*. [20--]. Disponível em: https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop. Acesso em: 17 nov. 2026.
- NODE.JS. *Introduction to Node.js*. [20--]. Disponível em: https://nodejs.org/learn/getting-started/introduction-to-nodejs. Acesso em: 17 nov. 2026.
- NODE.JS. *The Node.js Event Loop*. [20--]. Disponível em: https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick. Acesso em: 17 nov. 2026.
- RANISALT. *argon2.cpp*. In: node-argon2. [20--]. Disponível em: https://github.com/ranisalt/node-argon2/blob/master/argon2.cpp. Acesso em: 17 nov. 2026.
- RANISALT. *node-argon2*. [20--]. Disponível em: https://github.com/ranisalt/node-argon2#readme. Acesso em: 17 nov. 2026.


## 1.6 SGBD: PostgreSQL {#s1-6}

::: autoria-item
Autor(a): Kamilly Benigno de Paula · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

### Sistema Gerenciador de Banco de Dados

Um Sistema Gerenciador de Banco de Dados (SGBD) é um software responsável por armazenar, organizar, consultar, atualizar e administrar informações de maneira estruturada. Ele permite que aplicações realizem operações sobre os dados armazenados, mantendo sua organização e integridade.

Um exemplo de SGBD é o PostgreSQL, um sistema de gerenciamento de banco de dados relacional que utiliza a linguagem SQL (Structured Query Language) para realizar operações de consulta e manipulação de informações.

Em uma aplicação Web, o servidor de aplicação se comunica com o SGBD para armazenar e recuperar informações necessárias ao funcionamento do sistema. Em uma aplicação de autenticação, por exemplo, o banco de dados pode armazenar informações dos usuários, como identificadores, logins e hashes de senhas.

### Pool de conexões

Um pool de conexões é um mecanismo que mantém um conjunto de conexões disponíveis entre a aplicação e o banco de dados, permitindo que elas sejam reutilizadas durante a execução do sistema.

Sem esse mecanismo, a aplicação precisaria estabelecer uma nova conexão com o banco de dados para cada operação realizada, o que poderia aumentar o tempo de processamento e consumir mais recursos do servidor.

Com a utilização do pool, a aplicação solicita uma conexão disponível sempre que precisa executar uma consulta. Após a conclusão da operação, a conexão é liberada e pode ser reutilizada por outra solicitação.

No caso de aplicações desenvolvidas em Node.js que utilizam PostgreSQL, a biblioteca `node-postgres` disponibiliza esse recurso por meio da classe `Pool`, permitindo controlar a quantidade máxima de conexões e seu tempo de utilização.

Além disso, o pool permite configurar uma quantidade máxima de conexões simultâneas com o banco de dados. Esse controle evita que a aplicação abra conexões em excesso, contribuindo para o gerenciamento dos recursos disponíveis no servidor e do próprio SGBD.

Dessa forma, o pool contribui para melhorar o gerenciamento das conexões, reduzir operações desnecessárias de abertura e encerramento e permitir que várias requisições da aplicação utilizem o banco de dados de maneira organizada.

### Consultas parametrizadas

Uma consulta parametrizada é uma operação SQL na qual os comandos e os valores fornecidos pelo usuário são enviados separadamente ao banco de dados.

Esse mecanismo evita que os dados recebidos sejam interpretados como parte do comando SQL, reduzindo o risco de ataques conhecidos como SQL Injection.

Em vez de montar uma consulta por meio da concatenação de textos fornecidos pelo usuário, a implementação do repositório de usuários utiliza parâmetros identificados por marcadores específicos. No PostgreSQL, por exemplo, podem ser utilizados marcadores como `$1`, `$2` e `$3` para representar os valores que serão enviados separadamente.

Em uma aplicação de autenticação, uma consulta parametrizada pode ser utilizada para localizar um usuário a partir do identificador informado, sem inserir diretamente esse valor no comando SQL.

Exemplo:

```javascript
const consulta = `
    SELECT id, login, senha_hash
    FROM usuario
    WHERE login = $1
`;

const valores = [login];

const resultado = await pool.query(
    consulta,
    valores
);
```

Nesse exemplo, o comando SQL é definido separadamente do valor recebido na variável `login`. O marcador `$1` representa o primeiro parâmetro, que será enviado ao banco de dados por meio do segundo argumento da função `pool.query()`.

Essa separação permite que o PostgreSQL trate o valor como um dado, e não como parte da instrução SQL, contribuindo para a prevenção de SQL Injection.

A parametrização deve ser utilizada para os valores fornecidos pelo usuário. Ela não substitui outras medidas de segurança, como validação dos dados e controle de permissões no banco de dados.

### Retorno do resultado ao driver

Após receber uma consulta da aplicação, o SGBD executa a instrução SQL e retorna o resultado ao driver responsável pela comunicação entre a aplicação e o banco de dados.

No caso do PostgreSQL com a biblioteca `node-postgres`, a aplicação recebe um objeto de resultado que contém informações sobre a operação executada e os registros retornados.

Entre as principais propriedades disponíveis estão:

- `rows`: contém as linhas retornadas pela consulta.
- `fields`: apresenta informações sobre as colunas do resultado.
- `rowCount`: informa a quantidade de linhas afetadas ou retornadas, conforme a operação executada.

Por exemplo, quando uma consulta busca um usuário pelo login, o PostgreSQL retorna os registros encontrados ao driver. A biblioteca `node-postgres` organiza essas informações em um objeto JavaScript, permitindo que a aplicação acesse os dados por meio da propriedade `rows`.

Exemplo:

```javascript
const resultado = await pool.query(
    consulta,
    valores
);

console.log(resultado.rows);
```

Nesse caso, a propriedade `resultado.rows` contém os registros retornados pelo banco de dados. A aplicação pode utilizar essas informações para verificar se o usuário existe e, posteriormente, realizar as etapas necessárias para validar suas credenciais.

Quando a consulta é realizada diretamente por meio de `pool.query()`, a biblioteca `node-postgres` gerencia automaticamente a utilização da conexão, disponibilizando-a novamente no pool após a conclusão da operação. Dessa maneira, ela pode ser reutilizada por outras consultas da aplicação.

Dessa forma, a comunicação entre a aplicação e o SGBD permite armazenar, consultar e recuperar informações de forma organizada, enquanto o pool de conexões e as consultas parametrizadas contribuem para a eficiência e a segurança do acesso aos dados.

### Fontes

- NODE-POSTGRES. *Pooling*. [20--]. Disponível em: https://node-postgres.com/features/pooling. Acesso em: 17 nov. 2026.
- NODE-POSTGRES. *Queries*. [20--]. Disponível em: https://node-postgres.com/features/queries. Acesso em: 17 nov. 2026.
- NODE-POSTGRES. *Result*. [20--]. Disponível em: https://node-postgres.com/apis/result. Acesso em: 17 nov. 2026.
- OWASP. *SQL Injection Prevention Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- POSTGRESQL GLOBAL DEVELOPMENT GROUP. *PostgreSQL Documentation*. [20--]. Disponível em: https://www.postgresql.org/docs/current/. Acesso em: 17 nov. 2026.


## 1.7 Ciclo completo de uma requisição de login {#s1-7}

::: autoria-item
Autor(a): Lucas Rikelmi Macedo da Silva · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

A Figura 2 reúne, em ordem temporal, o que os itens 1.2 a 1.6 descrevem separadamente: o percurso de uma tentativa de login desde o clique do usuário até a exibição do resultado. Este item não repete o funcionamento de cada software; ele indica em que passo cada um atua e remete ao item que o detalha. Os números entre parênteses correspondem aos passos da figura.

![Figura 2 – Diagrama de sequência do processamento de uma requisição Web](file:///home/claude/aps-arquitetura/aps/diagramas/fig02-ciclo-requisicao-web.png)

Figura 2 – Diagrama de sequência do processamento de uma requisição Web. Fonte: elaborado pelos autores.

### Do navegador ao servidor web (passos 1 a 6)

O ciclo começa quando o usuário preenche o formulário e aciona "Entrar" (1). Antes de enviar qualquer dado, o navegador precisa do endereço IP do servidor: ele consulta o DNS (2) e recebe o endereço (3), como descrito no item 1.3. Com o endereço, abre a conexão TCP com a porta 443 (4) e, sobre ela, executa o handshake TLS 1.3, no qual o servidor se autentica pelo certificado (5), também no item 1.3. Só então o navegador envia a requisição `POST /api/auth/login` em HTTP/1.1, com as credenciais no corpo JSON, já cifrada (6). A montagem dessa requisição pelo JavaScript da página é o assunto do item 1.2.

### No servidor web (passos 7 e 8)

O Nginx encerra o TLS e aplica as regras de borda ao endpoint de login: tamanho máximo do corpo e limite de requisições por IP (7). Se uma delas for violada, a requisição termina ali. O próprio Nginx responde 413, quando o corpo passa do limite, ou 429, quando o IP passa da taxa, e a requisição não chega ao servidor de aplicação. Caso contrário, o Nginx a encaminha por `proxy_pass` ao Node.js, que escuta só na interface local, na porta 3000 (8). O item 1.4 traz essas regras e a configuração.

### No servidor de aplicação e no SGBD (passos 9 a 12)

No Node.js, a requisição chega ao tratador da rota de login (9). O caminho dela dentro do Express é o assunto do item 1.5. O tratador busca o usuário no PostgreSQL com uma consulta parametrizada, usando uma conexão do pool (10), e recebe a linha correspondente, ou nenhuma linha se o login não existir (11). O item 1.6 descreve essa consulta e o retorno ao driver. Entre os passos 11 e 12, o servidor de aplicação compara a senha informada com o hash armazenado e decide entre autenticado e não autenticado; essa decisão e a verificação com Argon2id são detalhadas no item 2.7. O resultado volta ao Nginx como resposta HTTP (12): 200 com a identificação do usuário, 401 quando as credenciais não conferem, ou 400 quando a requisição chega incompleta ou inválida. Se o PostgreSQL estiver indisponível, a decisão não pode ser tomada, e a resposta é da faixa 5xx, não 401, conforme o RFD03 do item 2.1 e o tratamento de erros do item 2.8.

### Do servidor web ao usuário (passos 13 a 15)

O Nginx devolve a resposta ao navegador pela mesma conexão cifrada (13). O JavaScript da página lê o código de status e o corpo e atualiza o DOM (14), como descrito no item 1.2. O usuário vê o resultado: o acesso liberado ou a mensagem de erro correspondente ao código recebido (15).

### Síntese

Tabela 2 – Correspondência entre os passos da Figura 2 e os itens da Seção 1

| Passos | Software | Item que detalha |
|---|---|---|
| 1, 6, 14, 15 | Navegador | 1.2 |
| 2 a 5 | DNS, TCP e TLS | 1.3 |
| 7, 8, 13 | Nginx | 1.4 |
| 9, 12 | Node.js com Express | 1.5 |
| 10, 11 | PostgreSQL | 1.6 |

Fonte: elaborado pelos autores.


# 2 Projeto da aplicação de autenticação {#s2}


## 2.1 Requisitos e escopo {#s2-1}

::: autoria-item
Autor(a): André Barbosa Alancardete · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

Este item estabelece o que o software de autenticação precisa fazer, sob quais restrições, e o que fica deliberadamente fora da solução. É a base de rastreabilidade do restante da Seção 2: as decisões arquiteturais (2.2), os componentes (2.4), o contrato da API (2.5) e a análise de ameaças (2.8) remetem aos identificadores definidos aqui.

Os requisitos estão separados por origem, de modo que se distinga o que o enunciado determina do que a equipe acrescentou:

- **Requisitos declarados (RF)** — derivam literalmente do Apêndice A do enunciado.
- **Requisitos derivados (RFD)** — decorrem logicamente dos declarados, mas não estão enunciados no Apêndice A.
- **Restrições de projeto (RNF)** — decisões da equipe sobre como a solução é construída, com justificativa e fonte.
- **Premissas e dependências externas (P)** — condições do ambiente das quais a solução depende e que ela não controla.

### Escopo do software

O domínio do problema é a verificação de credenciais. O software recebe um par de credenciais, verifica se correspondem a um usuário registrado e devolve a identidade desse usuário quando a verificação é bem-sucedida. O enunciado delimita o escopo de forma explícita: "somente verificação de credenciais, nada além disso".

A Tabela 2 relaciona cada requisito funcional declarado ao trecho do Apêndice A que lhe dá origem. A correspondência é direta: o Apêndice A enuncia quatro passos numerados e dois resultados de retorno, que originam seis requisitos.

Tabela 2 – Requisitos funcionais declarados e rastreabilidade ao Apêndice A

| Id | Requisito | Origem no Apêndice A |
|---|---|---|
| RF01 | Receber as credenciais enviadas pelo cliente, compostas por login (identificador de usuário ou endereço de e-mail) e senha. | Item 1 – Entrada de credenciais |
| RF02 | Verificar a existência do usuário no repositório de dados a partir do login informado. | Item 2 – Validação das credenciais |
| RF03 | Comparar a senha fornecida com a credencial registrada. | Item 3 – Comparação |
| RF04 | Decidir entre "autenticado" e "não autenticado". O resultado "não autenticado" cobre tanto credenciais inválidas quanto usuário inexistente. | Item 4 – Decisão de autenticação |
| RF05 | Em caso de sucesso, retornar objeto contendo a identificação do usuário. | Retorno de sucesso |
| RF06 | Em caso de falha, retornar erro de autenticação. | Retorno de falha |

Fonte: elaborado pelos autores, a partir do Apêndice A do enunciado.

A fusão dos dois casos de falha em um único resultado, no RF04, não é decisão da equipe: é a redação do próprio Apêndice A, que define "não autenticado" como resultado de "credenciais inválidas ou usuário inexistente". Essa fusão fundamenta o RNF03.

#### Delimitação do objeto de retorno

O RF05 determina que o retorno de sucesso contenha "a identificação do usuário". O Apêndice A descreve esse retorno como "um objeto contendo a identificação do usuário, suficiente para o cliente continuar o fluxo com o usuário autenticado". A expressão admite duas leituras, e a escolha entre elas define a fronteira do software:

- **Leitura restrita:** o retorno traz apenas a identidade verificada. A continuidade do fluxo é responsabilidade de quem chamou o serviço.
- **Leitura ampla:** o retorno traz também um token ou identificador de sessão, com o qual o cliente prossegue autenticado.

A equipe adota a leitura restrita: **o retorno de sucesso contém apenas a identificação do usuário, sem emissão de token ou de sessão.**

A justificativa está no próprio Apêndice A, em dois pontos. O primeiro delimita o software a "somente verificação de credenciais, nada além disso". O segundo descreve a saída como "a identidade desse usuário". Emitir sessão é função de um serviço de gestão de sessão: exige decidir tempo de validade, renovação e invalidação, e manter estado entre requisições, nenhum dos quais está descrito no domínio do problema.

A consequência da escolha é que a emissão de sessão ou token fica fora do escopo, como registrado adiante. Trata-se do único ponto da delimitação que depende de interpretação, e não de leitura direta do enunciado: caso a equipe obtenha orientação em sentido contrário, mudam em conjunto este item, a DA05 (2.2), o contrato da API (2.5) e os diagramas de sequência (2.7).

### Requisitos derivados

Os requisitos da Tabela 3 não constam do Apêndice A. Decorrem dos declarados: sem eles, há situações de execução para as quais a solução não define comportamento. Cada um indica o requisito declarado que o origina.

Tabela 3 – Requisitos derivados

| Id | Requisito | Decorre de | Motivo |
|---|---|---|---|
| RFD01 | Validar a estrutura da requisição antes de consultar o repositório, rejeitando corpo malformado ou com campo ausente, sem revelar se o login existe. | RF01 | O RF01 pressupõe credenciais bem formadas. Sem validação prévia, o software consultaria o repositório com entrada inválida. A resposta correspondente é o código 400, listado em 2.5. |
| RFD02 | Limitar o comprimento dos campos login e senha, rejeitando valores acima do limite. | RF01, RFD01 | Delimita o custo de processamento por requisição e evita que o cálculo do hash seja acionado para entrada desproporcional. |
| RFD03 | Distinguir falha de autenticação de falha de processamento, tratando a indisponibilidade do repositório como erro de infraestrutura e não como "não autenticado". | RF02, RF04 | O RF02 depende do repositório. Se ele estiver indisponível, a decisão do RF04 não pode ser tomada, e responder "não autenticado" informaria ao cliente um resultado que não foi apurado. A resposta correspondente é um código da faixa 5xx, a ser listado em 2.5. |

Fonte: elaborado pelos autores.

### Fora do escopo

Os elementos a seguir pertencem ao domínio mais amplo de gestão de identidade, mas não ao software projetado. A exclusão decorre da delimitação do Apêndice A e se apoia em dois fundamentos distintos.

**Primeiro fundamento: exigem escrita no repositório ou estado entre requisições.** O software descrito lê, compara, decide e responde, sem gravar dados e sem reter informação de uma requisição para a seguinte.

- Cadastro, alteração e recuperação de senha, que gravam no repositório.
- Autenticação multifator, que exige emitir um desafio, registrá-lo como pendente e conferi-lo em requisição posterior.
- Emissão, renovação e invalidação de sessão ou token, que exigem reter o que foi emitido para poder invalidá-lo. Esta exclusão decorre da leitura restrita adotada na delimitação do objeto de retorno e é o único ponto desta lista que depende de interpretação do enunciado.
- Bloqueio de conta por tentativas sucessivas, que exige contador de falhas por usuário (ver premissa P04).
- Gestão de usuários, perfis e permissões, que grava no repositório.

**Segundo fundamento: respondem a outra pergunta.** A autenticação responde quem é o usuário. A autorização responde o que esse usuário pode fazer, e pressupõe a identidade já verificada.

- Autorização e controle de acesso a recursos. O Apêndice A encerra a responsabilidade do software na devolução da identidade; a continuidade do fluxo cabe a quem o chamou.

A fronteira aqui declarada é representada graficamente na visão de contexto (2.3) e precisa ser coerente com o contrato da API (2.5).

### Restrições de projeto

As restrições da Tabela 4 não vêm do Apêndice A. São decisões da equipe sobre como a solução deve ser construída, cada uma com justificativa e fonte. Os identificadores RNF são referenciados pelos demais itens das Seções 1 e 2.

Tabela 4 – Restrições de projeto

| Id | Restrição | Valor adotado | Justificativa | Fonte |
|---|---|---|---|---|
| RNF01 | A comunicação externa ocorre exclusivamente por HTTPS. | HTTP/1.1 sobre TLS 1.3, porta 443. | A senha trafega no corpo da requisição e seria legível em texto claro sem cifragem. | RFC 8446 |
| RNF02 | A verificação da senha é feita por comparação contra hash Argon2id, nunca contra a senha em texto claro. | Parâmetros mínimos: 19 MiB de memória, 2 iterações, paralelismo 1. | Função de derivação de chave com custo de memória deliberado, resistente a ataque por GPU. Os parâmetros são o mínimo recomendado pela OWASP e devem ser elevados até o limite de latência aceitável no ambiente da equipe. | OWASP, *Password Storage Cheat Sheet*; RFC 9106 |
| RNF03 | A resposta e o tempo de processamento são equivalentes para usuário inexistente e para senha incorreta. | Mesmo código de status, mesmo corpo de erro e cálculo de hash também no caminho de usuário inexistente. | O Apêndice A já define um único resultado para os dois casos (RF04). A equivalência de tempo impede a enumeração de usuários por medição de latência. | OWASP, *Authentication Cheat Sheet* |
| RNF04 | O acesso ao repositório usa consultas parametrizadas. | Valores enviados ao SGBD separados do texto SQL. | Impede que o valor informado pelo usuário seja interpretado como parte do comando. Descrito em 1.6. | OWASP, *SQL Injection Prevention Cheat Sheet* |
| RNF05 | O servidor web aplica limite de taxa por endereço IP ao endpoint de login. | 10 requisições por minuto por IP, com rajada de 10; resposta 429. | Permite o uso normal mesmo com IP compartilhado e torna lenta a força bruta a partir de uma origem única, além de limitar o consumo de CPU e memória provocado pelo cálculo do hash. A configuração consta em 1.4. O limite por origem não substitui o limite por conta, discutido na premissa P04. | OWASP, *Authentication Cheat Sheet* |
| RNF06 | O servidor web aplica limite de tamanho ao corpo da requisição. | 1 KiB; resposta 413. | O corpo de uma requisição de login é um objeto JSON de dois campos curtos. O limite impede que o servidor de aplicação processe corpos arbitrariamente grandes. A configuração consta em 1.4 e o código de resposta é listado em 2.5. | RFC 9110, seção 15.5.14 |
| RNF07 | A senha, o hash e qualquer fragmento de ambos nunca são escritos em log, em mensagem de erro ou em resposta ao cliente. | Registro limitado a data, origem, endpoint, código de status e resultado da decisão. | O log é persistido e costuma ter controle de acesso mais fraco que o repositório de senhas. Registrar a credencial anula o RNF02. A fonte citada relaciona senhas e identificadores de sessão entre os valores que não devem ser registrados. A política é detalhada em 2.8. | OWASP, *Logging Cheat Sheet* |

Fonte: elaborado pelos autores.

O RNF01 aplica-se ao trecho externo da comunicação, entre o navegador e o servidor web. O encaminhamento entre o servidor web e o servidor de aplicação ocorre na interface de loopback do mesmo host, não deixa a máquina e, por isso, não usa TLS, como representado na Figura 1 (1.1).

### Premissas e dependências externas

Os pontos a seguir não são requisitos nem restrições do software projetado. São condições do ambiente das quais a solução depende, registradas para que a análise de 2.8 não lhes atribua mitigação dentro deste software.

**P01 – Formato de armazenamento da senha.** O repositório armazena a senha exclusivamente como hash Argon2id com salt, em cadeia no formato PHC, que já contém o salt e os parâmetros. Este software não cadastra nem altera senha, portanto não controla o armazenamento: depende dele. O formato é detalhado em 2.6.

**P02 – Unicidade e normalização do login.** O login é único no repositório e armazenado em forma normalizada, em minúsculas e sem espaços nas extremidades, de modo que a busca do RF02 retorne zero ou uma linha. A mesma normalização é aplicada ao valor recebido antes da consulta, sob pena de um login válido não ser encontrado. Detalhado em 2.6.

**P03 – Certificado TLS válido.** O servidor web dispõe de certificado digital válido, emitido para o nome de domínio em uso, condição para o RNF01. Descrito em 1.3.

**P04 – Limite de tentativas por conta não adotado.** A NIST SP 800-63B determina que o verificador limite as falhas consecutivas em uma mesma conta a no máximo 100. Esse controle é distinto do limite por origem do RNF05: um ataque distribuído por várias origens permanece abaixo do limite por IP enquanto acumula tentativas contra a mesma conta. Adotá-lo exigiria manter contador de falhas por usuário, isto é, escrita de estado no repositório, o que está fora do escopo definido no Apêndice A. A equipe adota apenas o limite por origem e registra a ausência do limite por conta como limitação conhecida.

### Limitações declaradas

Duas consequências das decisões acima são registradas aqui e retomadas na análise de ameaças (2.8).

O limite por endereço IP do RNF05 não contém ataque distribuído por várias origens e penaliza usuários legítimos que compartilham o mesmo endereço público, situação comum em redes corporativas e em operadoras móveis. É disponibilidade trocada por resistência a força bruta.

O custo deliberado do Argon2id, exigido pelo RNF02, torna o endpoint de login um alvo de negação de serviço: cada tentativa, mesmo inválida, consome memória e processamento do servidor. O RNF05 e o RFD02 são as mitigações previstas, e o RNF05 responde a esse risco tanto quanto à força bruta.

### Fontes

- BIRYUKOV, A.; DINU, D.; KHOVRATOVICH, D.; JOSEFSSON, S. *Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications*. RFC 9106. [S. l.]: IETF, set. 2021. Disponível em: https://www.rfc-editor.org/rfc/rfc9106. Acesso em: 17 nov. 2026.
- FIELDING, R.; NOTTINGHAM, M.; RESCHKE, J. (ed.). *HTTP Semantics*. RFC 9110. [S. l.]: IETF, jun. 2022. Disponível em: https://www.rfc-editor.org/rfc/rfc9110. Acesso em: 17 nov. 2026.
- NIST. *Digital Identity Guidelines: Authentication and Lifecycle Management*. SP 800-63B. [20--]. Disponível em: https://pages.nist.gov/800-63-3/sp800-63b.html. Acesso em: 17 nov. 2026.
- OWASP. *Authentication Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- OWASP. *Logging Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- OWASP. *Password Storage Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- OWASP. *SQL Injection Prevention Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- RESCORLA, E. *The Transport Layer Security (TLS) Protocol Version 1.3*. RFC 8446. [S. l.]: IETF, ago. 2018. Disponível em: https://www.rfc-editor.org/rfc/rfc8446. Acesso em: 17 nov. 2026.


## 2.2 Decisões arquiteturais {#s2-2}

::: autoria-item
Autor(a): André Barbosa Alancardete · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

Este item registra as decisões que estruturam a solução, com as alternativas consideradas e descartadas, o motivo da escolha, a referência que o sustenta e a consequência que a decisão produz. O registro existe porque uma decisão arquitetural sem alternativa declarada é indistinguível de uma preferência, e uma decisão sem consequência declarada esconde o custo que a equipe aceitou pagar.

O registro de decisões de arquitetura e do seu fundamento é objeto de norma: a ISO/IEC/IEEE 42010:2022 dedica a cláusula 5.2.12 às decisões de arquitetura e ao seu fundamento, e a cláusula 6.10 ao registro de ambos, separando o registro da decisão (6.10.1) do registro do fundamento (6.10.2). A estrutura adotada nesta tabela segue essa separação.

A coluna de referência indica o que sustenta o motivo: uma fonte bibliográfica, quando a escolha se apoia em recomendação técnica externa, ou o trecho do enunciado e o item do documento, quando a escolha decorre da delimitação do próprio problema. Cada decisão indica também os requisitos do item 2.1 a que serve. Decisões que não atendem requisito algum não são registradas aqui.

As decisões DA01 a DA05 constavam do registro preliminar e foram revisadas. As decisões DA06 a DA08 foram acrescentadas por corresponderem a escolhas já assumidas em outros itens e que não tinham registro próprio.

### Registro de decisões

Tabela 5 – Registro de decisões arquiteturais

| Id | Decisão | Alternativas descartadas | Motivo | Referência | Atende | Consequência aceita |
|---|---|---|---|---|---|---|
| DA01 | Organizar a aplicação em camadas: apresentação, negócio, dados e infraestrutura. | Arquitetura hexagonal; decomposição em microsserviços. | O domínio tem um único caso de uso. Microsserviços acrescentariam rede, implantação independente e consistência distribuída sem nenhum ganho correspondente. A arquitetura hexagonal resolveria um problema de múltiplos adaptadores que não existe aqui. | Apêndice A do enunciado; item 2.1 | RF01–RF06 | A separação é lógica, dentro de um mesmo processo. Não há isolamento de falha entre camadas: um defeito na camada de dados derruba o atendimento da requisição inteira. |
| DA02 | Expor a verificação como endpoint HTTP com corpo JSON: `POST /api/auth/login`. | Formulário HTML com processamento e renderização no servidor. | Desacopla o cliente do serviço. Qualquer cliente capaz de falar HTTP consome a mesma interface, o que é coerente com um serviço cuja saída é consumida por outro fluxo. | RFC 9110; item 2.1 (RFD01) | RF01, RF05, RF06 | A entrada deixa de ser validada pelo próprio formulário e passa a exigir validação explícita no servidor (RFD01). O contrato precisa ser especificado e versionado (2.5). |
| DA03 | Definir as interfaces `UserRepository` e `PasswordHasher`, com implementações concretas para PostgreSQL e Argon2id. | Uso direto do driver do SGBD e da biblioteca de hash dentro dos tratadores de rota. | O próprio Apêndice A descreve a origem dos dados como "repositório de dados", e não como banco relacional: a abstração é vocabulário do domínio, não indireção acrescentada. Quanto ao hash, a substituição do algoritmo é evento previsto, e não hipotético: a própria OWASP documenta o procedimento de migração de hashes legados. | Apêndice A do enunciado; OWASP, *Password Storage Cheat Sheet* | RF02, RF03, RNF02, RNF04 | Duas indireções a mais do que o caso de uso exigiria isoladamente, em tensão parcial com o princípio de economia da DA01. A tensão é aceita apenas nestes dois pontos, e não como padrão geral do projeto. |
| DA04 | Verificar a senha com Argon2id. | bcrypt; SHA-256. | SHA-256 é função de hash de propósito geral, projetada para ser rápida, o que a torna inadequada para senha. bcrypt é aceitável, mas seu custo é predominantemente de processamento. Argon2id impõe custo de memória, o que reduz a vantagem de ataques paralelos em GPU. É o algoritmo recomendado pela OWASP para armazenamento de senha, com parâmetros mínimos definidos no RNF02. | OWASP, *Password Storage Cheat Sheet*; RFC 9106 | RNF02 | Cada tentativa, inclusive inválida, consome memória e processamento do servidor. Isso converte o endpoint de login em alvo de negação de serviço, mitigado pelo RNF05 e pelo RFD02 e analisado em 2.8. |
| DA05 | Restringir o retorno de sucesso à identificação do usuário. | Retornar o registro completo do usuário; retornar token ou identificador de sessão. | O registro completo exporia o hash da senha, contrariando o RNF07. A emissão de token decorreria da leitura ampla do Apêndice A, descartada na delimitação do escopo (2.1). | Apêndice A do enunciado; item 2.1 (RNF07) | RF05, RNF07 | Quem consome o serviço precisa de outro mecanismo para manter o usuário autenticado entre requisições. Esse mecanismo está fora do escopo. |
| DA06 | Manter o cliente em HTML e JavaScript, sem framework de interface. | React ou framework equivalente de componentes. | O escopo exclui emissão de sessão, autorização e navegação autenticada. Sem esses elementos não há estado de cliente que justifique a camada adicional. A página também permanece na mesma origem da API, o que dispensa configuração de CORS. | Item 2.1 (seção "Fora do escopo"); item 1.1 | RF01 | Se o escopo for ampliado para incluir sessão ou navegação autenticada, a decisão deve ser reavaliada. A ausência de framework não é posição sobre a tecnologia, e sim consequência do tamanho do problema. |
| DA07 | Aplicar o limite de taxa no servidor web, e não no servidor de aplicação. | Middleware de limitação de taxa no Express. | A requisição excedente é rejeitada antes de ocupar o laço de eventos e antes do cálculo do hash, que é a operação cara. O servidor web é também a camada que termina o TLS e observa o endereço de origem. | Item 2.1 (RNF05); item 1.4 | RNF05 | O servidor de aplicação não conhece o estado do limite. A resposta 429 é produzida fora dele e não aparece em seus registros, o que precisa ser considerado na política de log (RNF07) e na análise de 2.8. |
| DA08 | Executar o cálculo do hash também quando o login não existe, comparando contra um valor fictício gerado com os mesmos parâmetros do hash real. | Retornar a falha imediatamente ao constatar que o login não existe. | O retorno imediato tornaria o caminho de usuário inexistente mensuravelmente mais rápido que o de senha incorreta, permitindo enumerar contas por medição de tempo. O Apêndice A já define um único resultado para os dois casos. Parâmetros diferentes no valor fictício reintroduziriam a diferença de tempo e anulariam a decisão. | OWASP, *Authentication Cheat Sheet*; item 2.1 (RNF03) | RNF03, RF04 | O custo do Argon2id passa a ser pago em toda tentativa, inclusive nas dirigidas a logins inexistentes, o que amplia a exposição descrita na consequência da DA04. |

### Relação com o item 2.1

As decisões acima não introduzem requisitos. Elas escolhem como atender os que já existem. Três pontos merecem destaque porque ligam este item aos demais:

A DA04 e a DA08 somam seus custos. O Argon2id é caro por projeto e, pela DA08, passa a ser calculado em toda tentativa. O RNF05 é a mitigação dessa soma, e não apenas uma defesa contra força bruta. A análise de ameaças (2.8) retoma esse ponto.

A DA03 está em tensão declarada com a DA01. A DA01 argumenta que um caso de uso único não justifica indireção adicional, e a DA03 acrescenta duas abstrações. A tensão é resolvida pelo alcance: a indireção é aceita apenas onde o próprio enunciado abstrai a origem dos dados e onde a substituição é um evento previsto. Não é adotada como padrão geral.

A DA06 foi trazida para este item. A decisão de dispensar framework de interface aparecia na justificativa da pilha (1.1), que é item descritivo do ambiente operacional. Escolha de arquitetura pertence ao registro de decisões, e mantê-la nos dois lugares caracterizaria sobreposição.

A DA01 declara quatro camadas, e não três. O registro preliminar era inconsistente neste ponto: o texto da decisão mencionava apresentação, negócio e dados, enquanto a tabela de componentes atribuía a verificação do hash a uma camada de infraestrutura. A quarta camada é adotada porque calcular hash não é operação de acesso a dados, e porque o item 2.4 descreve os componentes a partir desta divisão.

### Fontes

- BIRYUKOV, A.; DINU, D.; KHOVRATOVICH, D.; JOSEFSSON, S. *Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications*. RFC 9106. [S. l.]: IETF, set. 2021. Disponível em: https://www.rfc-editor.org/rfc/rfc9106. Acesso em: 17 nov. 2026.
- FIELDING, R.; NOTTINGHAM, M.; RESCHKE, J. (ed.). *HTTP Semantics*. RFC 9110. [S. l.]: IETF, jun. 2022. Disponível em: https://www.rfc-editor.org/rfc/rfc9110. Acesso em: 17 nov. 2026.
- ISO/IEC/IEEE. *42010:2022 – Software, systems and enterprise — Architecture description*. 2. ed. Genebra: ISO/IEC; IEEE, 2022. 62 p. Disponível em: https://www.iso.org/standard/74393.html. Acesso em: 17 nov. 2026.
- OWASP. *Authentication Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- OWASP. *Password Storage Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. Acesso em: 17 nov. 2026.


## 2.3 Visão de contexto {#s2-3}

::: autoria-item
Autor(a): André Barbosa Alancardete · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

Este item estabelece a fronteira do sistema: o que pertence à solução projetada, o que está fora dela e quem interage com ela. A visão de contexto é a primeira das visões de projeto e condiciona as seguintes: os componentes descritos em 2.4 existem dentro desta fronteira, e o contrato da API em 2.5 descreve como ela é atravessada.

A fronteira aqui definida corresponde ao escopo declarado em 2.1. Nada do que consta da lista "fora do escopo" daquele item aparece dentro da caixa do sistema.

### O que está dentro da fronteira

O sistema é o **Serviço de Autenticação** como implantado, e compreende dois elementos:

- O **servidor web**, que recebe as conexões externas, termina o TLS exigido pelo RNF01 e aplica os limites de taxa e de tamanho de corpo exigidos pelo RNF05 e pelo RNF06.
- O **servidor de aplicação**, que valida a requisição, executa a verificação das credenciais e produz a resposta, atendendo RF01 a RF06 e RFD01 a RFD03.

O servidor web integra o sistema porque duas restrições de projeto do item 2.1 lhe são atribuídas. Uma restrição aplicada por um elemento externo não seria restrição do sistema, e sim premissa sobre o ambiente, como ocorre com o certificado digital (P03).

A estrutura interna desses dois elementos não é objeto deste item. Os componentes da aplicação são descritos em 2.4.

### O que está fora da fronteira

**Usuário.** Pessoa que informa login e senha. Não interage diretamente com o sistema: faz isso por meio da aplicação cliente.

**Aplicação cliente.** No ambiente previsto, a página HTML com JavaScript descrita em 1.1 e registrada na DA06. É quem submete as credenciais e recebe o resultado. Pela DA02, qualquer cliente capaz de emitir uma requisição HTTP ocupa esse papel: o sistema não pressupõe um cliente específico.

A aplicação cliente tem posição dupla, e isso precisa ficar explícito para não gerar leitura equivocada da Figura 3. Ela é **servida pelo** servidor web, que entrega os arquivos estáticos, e é também **consumidora do** serviço, quando submete as credenciais. A Figura 3 representa apenas o segundo trajeto, o de consumo do serviço. A entrega dos arquivos estáticos pertence ao ambiente operacional e consta da Figura 1, no item 1.1.

**Repositório de usuários.** Sistema externo consultado para obter o registro correspondente ao login, conforme RF02. É externo por decisão de escopo, e não por acaso: o software projetado apenas lê. O cadastro, a alteração e a recuperação de senha estão fora do escopo (2.1), de modo que o conteúdo e o formato do repositório são premissa, não responsabilidade. As premissas P01 e P02 registram o que o sistema assume a respeito dele.

**Serviço de resolução de nomes.** Participa do ambiente operacional, descrito em 1.3, mas não é interlocutor do serviço de autenticação. Não aparece como ator nesta visão.

### Travessias da fronteira

A fronteira é atravessada em três pontos, e apenas nestes três:

Tabela 7 – Travessias da fronteira do sistema

| Travessia | Sentido | Conteúdo | Especificado em |
|---|---|---|---|
| Aplicação cliente para o sistema | Entrada | Credenciais, em requisição HTTP sobre TLS | 2.5, contrato da API |
| Sistema para a aplicação cliente | Saída | Identificação do usuário, em caso de sucesso, ou erro de autenticação | 2.5, contrato da API |
| Sistema para o repositório de usuários | Saída e retorno | Consulta parametrizada por login e registro correspondente | 1.6 e 2.6 |

Fonte: elaborado pelos autores.

Não há outra entrada. O sistema não expõe rota administrativa, não recebe notificação de sistema externo e não mantém canal aberto entre requisições.

### Figura 3

![Figura 3 – Diagrama de contexto do Serviço de Autenticação](file:///home/claude/aps-arquitetura/aps/diagramas/fig03-contexto.png)

Figura 3 – Diagrama de contexto do Serviço de Autenticação. Fonte: elaborado pelos autores.

A Figura 3 representa a fronteira descrita acima, com o sistema ao centro, os atores externos ao redor e as travessias identificadas. O trajeto representado é o de consumo do serviço: a submissão das credenciais, o retorno do resultado e a consulta ao repositório. A entrega dos arquivos estáticos à aplicação cliente não consta desta figura, por pertencer ao ambiente operacional, descrito no item 1.1.

### Fronteira e escopo

Três elementos recorrentes em sistemas de autenticação não aparecem nesta visão, e a ausência é deliberada.

Não há serviço de sessão nem emissor de token, em razão da leitura restrita do objeto de retorno adotada em 2.1. Não há serviço de autorização, porque a autorização responde a pergunta distinta da que este sistema responde. Não há serviço de gestão de usuários, porque toda escrita no repositório está fora do escopo.

Um diagrama de contexto que trouxesse qualquer um deles contradiria o item 2.1.

### Fontes

Este item não utiliza bibliografia externa. A fronteira decorre do escopo definido no Apêndice A do enunciado e consolidado no item 2.1, e das decisões registradas no item 2.2.


## 2.4 Componentes {#s2-4}

::: autoria-item
Autor(a): Kamilly Benigno de Paula · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

### Organização dos componentes

A arquitetura da aplicação é organizada em quatro camadas: apresentação, negócio, dados e infraestrutura. Essa divisão permite separar as responsabilidades de cada parte do sistema, facilitando a manutenção, a compreensão do funcionamento e a substituição de implementações específicas sem alterar diretamente as regras de negócio.

A organização segue a decisão arquitetural DA01, registrada no item 2.2. A aplicação utiliza HTML e JavaScript no cliente, Nginx como servidor Web e proxy reverso, Node.js com Express no servidor de aplicação e PostgreSQL como sistema gerenciador de banco de dados.

### Camada de apresentação

A camada de apresentação é responsável pela interação com o usuário e pelo recebimento das requisições relacionadas à autenticação. Ela é composta pela página HTML, pelos scripts JavaScript executados no navegador e pelo componente `AuthController`.

O HTML define a estrutura da interface, incluindo os campos necessários para a entrada das credenciais. O JavaScript captura os dados informados pelo usuário e utiliza a API Fetch para enviar uma requisição HTTP do tipo POST ao endpoint `/api/auth/login`, com o conteúdo no formato JSON.

O `AuthController` recebe a requisição encaminhada pela rota correspondente, realiza a validação do formato dos dados recebidos e direciona as informações válidas ao serviço de autenticação. Após o processamento, também é responsável por organizar e devolver a resposta HTTP ao cliente.

Em caso de autenticação bem-sucedida, a resposta contém somente a identificação do usuário, sem expor o hash da senha. Em caso de falha, o controlador retorna a resposta de erro correspondente.

Conforme a decisão DA06 do item 2.2, a interface utiliza HTML e JavaScript sem a adoção de um framework adicional.

### Camada de negócio

A camada de negócio concentra as regras relacionadas ao processo de autenticação. Seu principal componente é o serviço de autenticação, denominado `AuthenticationService`.

Esse serviço coordena as operações necessárias para verificar as credenciais informadas pelo usuário. Para acessar os dados, utiliza a interface `UserRepository`. Para verificar a senha, utiliza a interface `PasswordHasher`.

Essas interfaces permitem separar as regras de autenticação das implementações responsáveis pelo armazenamento e pela verificação das senhas. Dessa maneira, a camada de negócio não depende diretamente do PostgreSQL nem de uma biblioteca específica de hash.

O serviço também aplica a regra definida pela decisão DA08: mesmo quando o usuário não é encontrado, realiza a operação de verificação utilizando um hash fictício com os mesmos parâmetros do hash real. Essa medida reduz diferenças de tempo que poderiam permitir a identificação de contas existentes.

### Camada de dados

A camada de dados é responsável pela persistência e recuperação das informações dos usuários. Ela contém o componente `PgUserRepository`, responsável por implementar a interface `UserRepository` e realizar as operações necessárias no banco de dados PostgreSQL.

Esse componente executa consultas parametrizadas para localizar os registros de usuários, evitando a concatenação direta de dados fornecidos pelo cliente nas instruções SQL.

O repositório acessa a tabela `usuario`, que armazena o identificador, o login normalizado e o hash da senha. A estrutura dessa tabela é apresentada no item 2.6.

A utilização do repositório permite que a camada de negócio solicite informações sem precisar conhecer os detalhes de comunicação com o banco de dados.

### Camada de infraestrutura

A camada de infraestrutura reúne os componentes responsáveis pela comunicação externa e pelas implementações técnicas utilizadas pelo sistema.

O Nginx recebe as conexões HTTPS na porta 443, realiza a terminação TLS, disponibiliza os arquivos estáticos e encaminha as requisições destinadas à API para o servidor de aplicação.

O servidor Node.js com Express recebe as requisições encaminhadas pelo Nginx e disponibiliza as rotas utilizadas pela aplicação. Essas rotas direcionam as requisições ao `AuthController`, responsável pelo tratamento da entrada e da resposta HTTP.

Essa camada também contém a implementação concreta da interface `PasswordHasher`, denominada `Argon2idPasswordHasher`, responsável por utilizar o algoritmo Argon2id para verificar as senhas.

A separação entre a interface `PasswordHasher` e sua implementação concreta permite que a camada de negócio utilize a operação de verificação sem depender diretamente da biblioteca responsável pelo algoritmo.

### Comunicação entre os componentes

O processo de autenticação começa quando o usuário informa suas credenciais na interface apresentada pelo navegador.

O JavaScript envia uma requisição HTTP para o endpoint `POST /api/auth/login`. O Nginx recebe a conexão HTTPS, aplica os limites configurados e encaminha a requisição para o servidor Node.js com Express.

A rota correspondente direciona a requisição ao `AuthController`, localizado na camada de apresentação. O controlador valida o formato dos dados recebidos e encaminha as informações ao `AuthenticationService`, na camada de negócio.

O serviço de autenticação utiliza a interface `UserRepository` para localizar o usuário na camada de dados e a interface `PasswordHasher` para verificar a senha informada. As implementações concretas dessas interfaces são, respectivamente, `PgUserRepository`, que realiza o acesso ao PostgreSQL, e `Argon2idPasswordHasher`, que realiza a verificação utilizando Argon2id.

Após concluir a verificação, o serviço retorna o resultado ao `AuthController`. Em caso de sucesso, o controlador devolve uma resposta contendo somente a identificação do usuário, sem expor o registro completo ou o hash da senha. Em caso de falha, retorna a resposta correspondente ao contrato da API.

Dessa forma, cada componente possui uma responsabilidade definida, enquanto a comunicação entre as camadas permite executar o processo de autenticação de maneira organizada.

Tabela 5 – Componentes da aplicação e suas responsabilidades

| Camada | Componente | Responsabilidade |
|---|---|---|
| Apresentação | Página HTML | Estruturar a interface de autenticação e os campos de entrada. |
| Apresentação | JavaScript / Fetch | Capturar as credenciais, enviar a requisição HTTP e tratar a resposta recebida. |
| Apresentação | `AuthController` | Receber a requisição, validar o formato dos dados, acionar o serviço de autenticação e organizar a resposta HTTP. |
| Negócio | `AuthenticationService` | Coordenar o processo de autenticação e aplicar as regras de negócio. |
| Negócio | `UserRepository` | Definir a interface para localizar e recuperar informações dos usuários. |
| Negócio | `PasswordHasher` | Definir a interface para verificar a senha informada. |
| Dados | `PgUserRepository` | Implementar o acesso aos registros de usuários no PostgreSQL. |
| Dados | PostgreSQL | Armazenar os dados persistentes da tabela `usuario`. |
| Infraestrutura | Nginx | Receber conexões HTTPS, realizar terminação TLS, servir arquivos estáticos, encaminhar requisições e aplicar limites. |
| Infraestrutura | Node.js / Express | Executar o servidor de aplicação e disponibilizar as rotas HTTP. |
| Infraestrutura | `Argon2idPasswordHasher` | Implementar a verificação de senhas utilizando o algoritmo Argon2id. |

Fonte: elaborado pelos autores.

### Figura 4 – Componentes da aplicação por camada

![Figura 4 – Componentes da aplicação por camada](file:///home/claude/aps-arquitetura/aps/diagramas/fig04-componentes.png)

Figura 4 – Componentes da aplicação por camada. Fonte: elaborado pelos autores.

A Figura 4 apresenta a organização dos componentes da aplicação nas quatro camadas arquiteturais e as relações de comunicação entre eles. É possível observar a separação entre os elementos responsáveis pela interação com o usuário, pela execução das regras de autenticação, pela persistência dos dados e pelos recursos de infraestrutura.

Na camada de apresentação, o `AuthController` recebe as requisições e realiza a validação do formato dos dados. Na camada de negócio, o `AuthenticationService` coordena o processo de autenticação e utiliza as interfaces `UserRepository` e `PasswordHasher`. Na camada de dados, o `PgUserRepository` implementa o acesso ao PostgreSQL. Já na infraestrutura, estão os componentes responsáveis pela comunicação HTTP, pelo Nginx e pela implementação do algoritmo Argon2id.

Essa organização demonstra como os componentes colaboram para realizar a autenticação, mantendo suas responsabilidades separadas e respeitando a arquitetura definida no item 2.2.

### Fontes

- EXPRESS. *Express 5.x – API Reference*. [20--]. Disponível em: https://expressjs.com/en/5x/api.html. Acesso em: 17 nov. 2026.
- FIELDING, R.; NOTTINGHAM, M.; RESCHKE, J. (ed.). *HTTP Semantics*. RFC 9110. [S. l.]: IETF, jun. 2022. Disponível em: https://www.rfc-editor.org/rfc/rfc9110. Acesso em: 17 nov. 2026.
- NGINX. *Beginner's Guide*. [20--]. Disponível em: https://nginx.org/en/docs/beginners_guide.html. Acesso em: 17 nov. 2026.
- NODE.JS. *Node.js Documentation*. [20--]. Disponível em: https://nodejs.org/docs/latest/api/. Acesso em: 17 nov. 2026.
- OWASP. *Password Storage Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- POSTGRESQL GLOBAL DEVELOPMENT GROUP. *PostgreSQL Documentation*. [20--]. Disponível em: https://www.postgresql.org/docs/current/. Acesso em: 17 nov. 2026.


## 2.5 Contrato da API {#s2-5}

::: autoria-item
Autor(a): Grazieli da Silva Macedo · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

::: pendente
[Pendente: aps/secoes/2.5.md]
:::


## 2.6 Modelo de dados {#s2-6}

::: autoria-item
Autor(a): Kamilly Benigno de Paula · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

### Estrutura da tabela

O modelo de dados utiliza a tabela `usuario`, responsável por armazenar as informações necessárias para identificar o usuário e permitir a verificação de sua senha durante a autenticação. A estrutura segue os tipos apresentados na Figura 5.

| Campo | Tipo | Restrições e finalidade |
|---|---|---|
| `id` | `uuid` | Chave primária, gerada automaticamente por `gen_random_uuid()`. |
| `login` | `varchar(254)` | Não nulo e único. Armazena o login normalizado do usuário. |
| `senha_hash` | `varchar(255)` | Não nulo. Armazena o hash da senha, gerado com Argon2id. |

Fonte: elaborado pelos autores.

A definição da tabela em SQL é:

```sql
CREATE TABLE usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login VARCHAR(254) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL
);
```

### Regra de armazenamento do login

Conforme a premissa P02, definida no item 2.1, o repositório já mantém o login em sua forma normalizada. Assim, antes de realizar a consulta, o serviço de autenticação aplica ao valor recebido a mesma regra de normalização. Dessa maneira, a comparação é feita utilizando o mesmo padrão adotado no armazenamento.

O cadastro de usuários não faz parte do escopo deste projeto. Portanto, este item considera a premissa P02 como condição para que os dados existentes no repositório estejam armazenados de forma compatível com a consulta.

### Armazenamento da senha

O campo `senha_hash` armazena o resultado da aplicação do algoritmo Argon2id à senha do usuário. A aplicação não deve armazenar senhas em texto puro. O valor codificado do hash contém as informações necessárias para a verificação, como os parâmetros utilizados, o salt e o resultado do processamento.

Durante a autenticação, o serviço obtém o hash correspondente ao login consultado e utiliza o componente responsável pela verificação de senhas para comparar a senha recebida com o hash armazenado.

### Figura 5 – Modelo de dados

![Figura 5 – Modelo de dados](file:///home/claude/aps-arquitetura/aps/diagramas/fig05-modelo-dados.png)

Figura 5 – Modelo de dados. Fonte: elaborado pelos autores.

A Figura 5 apresenta a estrutura da tabela `usuario`, com os campos `id`, `login` e `senha_hash`, seus respectivos tipos e as restrições aplicadas. O campo `id` identifica cada registro por meio de um UUID; o campo `login` armazena o identificador normalizado e possui restrição de unicidade; e o campo `senha_hash` guarda o hash utilizado no processo de autenticação.

### Relação com o acesso ao banco de dados

O componente `PgUserRepository` implementa o acesso à tabela `usuario` por meio do PostgreSQL. Para consultar um usuário, utiliza consultas parametrizadas, evitando a concatenação direta de valores recebidos na instrução SQL. A conexão com o banco é realizada por meio de um pool de conexões, conforme descrito no item 1.6.

A consulta utiliza o login normalizado recebido do serviço de autenticação e retorna os dados necessários para o processo, incluindo o identificador do usuário e o hash da senha. O hash é utilizado pelo componente responsável pela verificação com Argon2id, sem ser exposto na resposta enviada ao cliente.

### Fontes

- BIRYUKOV, A.; DINU, D.; KHOVRATOVICH, D.; JOSEFSSON, S. *Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications*. RFC 9106. [S. l.]: IETF, set. 2021. Disponível em: https://www.rfc-editor.org/rfc/rfc9106. Acesso em: 17 nov. 2026.
- OWASP. *Password Storage Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- POSTGRESQL GLOBAL DEVELOPMENT GROUP. *Constraints*. [20--]. Disponível em: https://www.postgresql.org/docs/current/ddl-constraints.html. Acesso em: 17 nov. 2026.
- POSTGRESQL GLOBAL DEVELOPMENT GROUP. *UUID Type*. [20--]. Disponível em: https://www.postgresql.org/docs/current/datatype-uuid.html. Acesso em: 17 nov. 2026.


## 2.7 Desenho detalhado {#s2-7}

::: autoria-item
Autor(a): André Barbosa Alancardete · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

Este item descreve a estrutura estática da aplicação, a lógica de decisão da autenticação e o comportamento dinâmico nos casos de sucesso e de falha, por meio das Figuras 6 a 9.

As classes aqui descritas realizam os componentes identificados em 2.4 e implementam as decisões registradas em 2.2. A lógica de decisão e as sequências correspondem aos requisitos definidos em 2.1.

### Recorte comum às figuras

Três conjuntos de situações não aparecem nas figuras deste item, e a ausência é deliberada em todos os casos.

**O servidor web não figura nas sequências.** As Figuras 8 e 9 representam o processamento interno da aplicação, a partir do ponto em que o servidor web já aceitou a requisição e a encaminhou ao servidor de aplicação. A Figura 1, no item 1.1, representa o trajeto completo, e o item 2.3 posiciona ambos dentro da fronteira do sistema. Trata-se de nível de detalhe, não de divergência entre figuras.

**As respostas 413 e 429 não constam de nenhuma figura.** Elas são produzidas pelo servidor web antes de a requisição alcançar a aplicação, conforme o RNF06, o RNF05 e a DA07.

**A indisponibilidade do repositório não é representada.** A equipe optou por limitar a Figura 7 aos desfechos definidos no Apêndice A do enunciado, que são autenticado e não autenticado, acrescidos da rejeição por formato. O RFD03 permanece descrito no item 2.1 e tratado no contrato do item 2.5, sem representação gráfica. Registra-se a opção para que a ausência não seja lida como omissão.

### Figura 6 – Diagrama de classes

![Figura 6 – Diagrama de classes](file:///home/claude/aps-arquitetura/aps/diagramas/fig06-classes.png)

Figura 6 – Diagrama de classes do serviço de autenticação. Fonte: elaborado pelos autores.

A Figura 6 apresenta dez tipos e suas relações. As camadas da DA01 não são desenhadas na figura; a atribuição de cada componente à sua camada consta do item 2.4.

`AuthController` recebe a requisição e expõe `login(req, res)`. Ele depende de `AuthenticationService` e converte a entrada em `LoginRequest`, tipo que carrega apenas `login` e `senha`, atendendo ao RF01.

`AuthenticationService` concentra a regra de negócio. Seu método `authenticate(LoginRequest)` devolve `AuthResult` e executa, em ordem, a busca do usuário (RF02), a comparação da senha (RF03) e a decisão (RF04). O serviço declara três atributos: `repo`, do tipo `UserRepository`; `hasher`, do tipo `PasswordHasher`; e `dummyHash`, uma cadeia usada quando o login não existe. A presença desse terceiro atributo na estrutura, e não apenas no fluxo, registra a DA08 como parte do projeto e não como detalhe de implementação.

As duas dependências do serviço são interfaces, e não classes concretas. `UserRepository` declara `findByLogin(login): Usuario` e é realizada por `PgUserRepository`, que mantém um `pool` de conexões. `PasswordHasher` declara `verify(senha, hash): boolean` e é realizada por `Argon2idPasswordHasher`. Essa separação é a DA03: a regra de negócio não conhece PostgreSQL nem Argon2id, e a substituição de qualquer um dos dois não a alcança. O RNF02 e o RNF04 são atendidos pelas implementações concretas, não pela camada de negócio.

Dois tipos representam o usuário, com conteúdos deliberadamente diferentes. `Usuario` é o registro recuperado do repositório e contém `id`, `login` e `senhaHash`. `UserIdentity` é o que compõe o `AuthResult` devolvido ao cliente e contém apenas `id` e `login`. O hash existe no primeiro e não existe no segundo. Essa diferença é a DA05 expressa na estrutura: o hash não deixa de ser exposto por disciplina de quem escreve a resposta, mas porque o tipo que sai do serviço não tem onde guardá-lo. O RNF07 é sustentado pela mesma separação.

A figura também evidencia a correspondência entre o nome da coluna no repositório e o nome do atributo no objeto. O diagrama usa `senhaHash` no tipo `Usuario`, enquanto a consulta exibida na Figura 8 usa `senha_hash`. São a mesma informação em convenções distintas, próprias de cada camada, e o modelo de dados do item 2.6 define a forma persistida.

### Figura 7 – Fluxo de decisão

![Figura 7 – Fluxo de decisão de autenticação](file:///home/claude/aps-arquitetura/aps/diagramas/fig07-decisao.png)

Figura 7 – Fluxo de decisão da autenticação. Fonte: elaborado pelos autores.

A Figura 7 apresenta o caminho desde a chegada das credenciais até um de três desfechos.

A primeira decisão é o formato da requisição. Entrada malformada ou com campo ausente encerra o fluxo com 400, sem consulta ao repositório. Esse ramo atende ao RFD01 e ao RFD02, e justifica o código 400 listado no contrato do item 2.5.

A segunda decisão é a existência do usuário. O ramo negativo **não encerra o fluxo**: ele segue para uma verificação de senha antes de produzir o 401. Essa verificação ocorre contra o valor fictício declarado na Figura 6, e é a DA08. O ramo positivo recupera o registro e verifica a senha contra o hash armazenado, conforme o RF03.

A terceira decisão é a conferência da senha. O ramo positivo produz 200 com a identidade, atendendo ao RF05. O ramo negativo produz 401.

O aspecto mais relevante da figura é a convergência: os dois ramos de falha, usuário inexistente e senha incorreta, terminam no **mesmo nó de 401**. Não há saída distinta para cada caso. É o RNF03 representado graficamente, e não apenas afirmado em texto. Como ambos os caminhos passam pelo cálculo de um hash Argon2id com os mesmos parâmetros, as duas falhas também custam tempo equivalente, o que remove a diferença mensurável que permitiria enumerar contas existentes. O RF04 do item 2.1, que funde os dois casos em um único resultado, é o requisito que a convergência atende.

### Figura 8 – Sequência de autenticação bem-sucedida

![Figura 8 – Sequência de autenticação bem-sucedida](file:///home/claude/aps-arquitetura/aps/diagramas/fig08-sequencia-sucesso.png)

Figura 8 – Sequência de autenticação bem-sucedida. Fonte: elaborado pelos autores.

A Figura 8 percorre onze passos entre a submissão das credenciais e a resposta de sucesso.

O navegador submete `POST /api/auth/login` com `login` e `senha` no corpo, conforme a DA02 e o RF01. O `AuthController` valida o formato da requisição, conferindo campos obrigatórios e tamanho, o que atende ao RFD01 e ao RFD02; essa validação ocorre antes de qualquer acesso ao repositório, de modo que entrada inválida não consome consulta.

Validada a entrada, o controlador delega a decisão ao `AuthenticationService`, que solicita o usuário ao `PgUserRepository` por meio de `findByLogin(login)`. O repositório emite ao PostgreSQL a consulta `SELECT id, login, senha_hash FROM usuario WHERE login = $1`, em que o marcador `$1` separa o valor informado pelo usuário do texto do comando, atendendo ao RNF04. O banco devolve uma linha, que o repositório converte no objeto `Usuario`.

De posse do registro, o serviço invoca `verify(senha, usuario.senhaHash)` no `Argon2idPasswordHasher`, atendendo ao RF03 e ao RNF02. A verificação retorna verdadeiro, e o serviço produz `AuthResult(autenticado = true, UserIdentity)`.

O controlador converte esse resultado em `200 OK` com corpo `{id, login}`. O corpo contém apenas os dois campos de `UserIdentity`: não há hash, nem o registro completo, nem token ou identificador de sessão. É o RF05 atendido na forma definida pela DA05 e pela delimitação do objeto de retorno do item 2.1.

### Figura 9 – Sequência de autenticação malsucedida

![Figura 9 – Sequência de autenticação malsucedida](file:///home/claude/aps-arquitetura/aps/diagramas/fig09-sequencia-falha.png)

Figura 9 – Sequência de autenticação malsucedida. Fonte: elaborado pelos autores.

A Figura 9 reúne os três modos de falha em um único diagrama, por meio de dois blocos alternativos aninhados.

O primeiro bloco separa a requisição malformada da requisição bem formada. No ramo de requisição malformada, o controlador responde `400 Bad Request` com corpo `{erro: "requisição inválida"}`, sem acionar o serviço de autenticação. Esse ramo atende ao RFD01 e ao RFD02.

O segundo bloco, interno ao ramo de formato válido, separa os dois modos de falha de credencial.

No ramo de **usuário inexistente**, o repositório devolve nulo. O serviço não encerra o processamento: invoca `verify(senha, dummyHash)`, verificando a senha contra o valor fictício declarado na Figura 6. A figura anota esse passo com a observação de que ele iguala o tempo de resposta, com finalidade de impedir a enumeração de contas. É a DA08 representada, e é o que torna o RNF03 verificável em vez de meramente declarado.

No ramo de **usuário existente com senha incorreta**, o repositório devolve o objeto `Usuario` e o serviço invoca `verify(senha, usuario.senhaHash)`. A verificação retorna falso.

Os dois ramos convergem: ambos produzem `AuthResult(autenticado = false)` e, em seguida, `401 Unauthorized` com corpo `{erro: "credenciais inválidas"}`. O código, a mensagem e o custo de processamento são idênticos nos dois casos, porque ambos executam um cálculo Argon2id com os mesmos parâmetros. Um cliente que meça o tempo de resposta ou compare os corpos não distingue um login inexistente de uma senha errada.

Essa convergência atende ao RF04, que o Apêndice A do enunciado já define como resultado único para credenciais inválidas ou usuário inexistente, ao RF06 e ao RNF03.

Cabe registrar uma consequência operacional desse desenho, retomada na análise do item 2.8: como o cálculo do hash ocorre também no ramo de usuário inexistente, toda tentativa dirigida ao endpoint consome memória e processamento do servidor, independentemente de o login existir. O limite de taxa do RNF05 é a mitigação prevista.

### Rastreabilidade

Tabela 10 – Correspondência entre as figuras deste item e os requisitos e decisões

| Elemento | Figura | Atende |
|---|---|---|
| `LoginRequest` e validação de formato e tamanho | 6, 8, 9 | RF01, RFD01, RFD02 |
| `UserRepository`, `PgUserRepository` e consulta parametrizada | 6, 8 | RF02, RNF04 |
| `PasswordHasher`, `Argon2idPasswordHasher` e `verify` | 6, 8, 9 | RF03, RNF02 |
| Atributo `dummyHash` e ramo de usuário inexistente | 6, 7, 9 | RNF03, DA08 |
| Convergência dos dois ramos de falha no 401 | 7, 9 | RF04, RF06, RNF03 |
| `UserIdentity` sem campo de hash e resposta `200 OK {id, login}` | 6, 8 | RF05, RNF07, DA05 |
| Separação em quatro camadas | 6 | DA01 |
| Uso de interfaces em vez de classes concretas | 6 | DA03 |
| `POST /api/auth/login` com corpo JSON | 8, 9 | RF01, DA02 |
| Ramo de requisição malformada com 400 | 7, 9 | RFD01, RFD02 |

Fonte: elaborado pelos autores.

### Fontes

Este item não utiliza bibliografia externa. As figuras são produto da equipe, e os requisitos e decisões referenciados estão nos itens 2.1 e 2.2, com as respectivas fontes.


## 2.8 Segurança e tratamento de erros {#s2-8}

::: autoria-item
Autor(a): André Barbosa Alancardete · Revisor(a): Lucas Rikelmi Macedo da Silva
:::

Este item relaciona as ameaças consideradas no projeto às mitigações adotadas, indicando para cada uma o item em que a mitigação é descrita. Registra também os riscos que permanecem sem mitigação, a política de registro em log e o tratamento de erros.

Uma tabela de ameaças só é verificável se cada mitigação puder ser localizada. Por isso a coluna "Onde" aponta item e identificador de requisito, e não uma afirmação genérica de que o projeto trata o assunto.

### Escopo da análise

A análise cobre as ameaças ao serviço de verificação de credenciais, dentro da fronteira definida em 2.3.

Não cobre a segurança da infraestrutura que hospeda o serviço, como endurecimento do sistema operacional, controle de acesso ao servidor ou proteção do repositório de dados contra acesso direto. Esses elementos pertencem à operação do ambiente e não ao projeto do software, e por isso não constam dos requisitos do item 2.1.

Também não cobre ameaças a funcionalidades fora do escopo. Sequestro de sessão, elevação de privilégio e abuso de recuperação de senha não se aplicam a um software que não emite sessão, não autoriza e não escreve no repositório.

### Ameaças e mitigações

Tabela 11 – Ameaças consideradas e mitigações adotadas

| Ameaça | Mitigação adotada | Onde |
|---|---|---|
| Interceptação da senha em trânsito | Comunicação externa exclusivamente por HTTPS, com TLS 1.3. | 1.3; RNF01 (2.1) |
| Leitura da senha em caso de vazamento do repositório | A senha nunca é armazenada em texto claro: o repositório guarda hash Argon2id com salt, e o serviço apenas compara contra ele. O armazenamento é premissa sobre o repositório, não ação deste software. | 2.6; RNF02 e P01 (2.1) |
| Quebra do hash por força bruta sobre o banco vazado | Argon2id com custo de memória, em parâmetros mínimos de 19 MiB, 2 iterações e paralelismo 1, que reduz a vantagem de ataque paralelo em GPU (OWASP, *Password Storage Cheat Sheet*). | DA04 (2.2); RNF02 (2.1) |
| Enumeração de contas pela resposta | Código e corpo idênticos para usuário inexistente e senha incorreta. Os dois ramos de falha convergem no mesmo desfecho. | Figuras 7 e 9 (2.7); RF04 e RNF03 (2.1) |
| Enumeração de contas pelo tempo de resposta | Cálculo de hash também no caminho de usuário inexistente, contra valor fictício com os mesmos parâmetros. | DA08 (2.2); Figuras 7 e 9 (2.7); RNF03 (2.1) |
| Injeção de SQL | Consulta parametrizada, com o valor informado pelo usuário enviado separado do texto do comando (OWASP, *SQL Injection Prevention Cheat Sheet*). | 1.6; RNF04 (2.1) |
| Força bruta de senha a partir de uma origem | Limite de taxa por endereço IP no servidor web, aplicado ao endpoint de login, com resposta 429. | 1.4; RNF05 (2.1); DA07 (2.2) |
| Negação de serviço pelo custo do hash | Limite de taxa por IP no servidor web: a requisição excedente é rejeitada antes de ocupar o laço de eventos e antes do cálculo. Entre as mitigações adotadas, é a única efetiva contra tentativas bem formadas, porque o custo do Argon2id decorre dos parâmetros adotados e não do tamanho dos campos recebidos. O limite de comprimento do RFD02 descarta apenas entrada desproporcional, antes do cálculo. | 1.4; RNF05 e RFD02 (2.1); DA07 (2.2) |
| Negação de serviço por corpo de requisição grande | Limite de tamanho do corpo no servidor web, com resposta 413. | 1.4; RNF06 (2.1) |
| Exposição da credencial em registro de log | A senha, o hash e qualquer fragmento de ambos nunca são escritos em log, mensagem de erro ou resposta. | RNF07 (2.1); política de registro, neste item |
| Exposição de detalhe interno em mensagem de erro | Corpos de erro genéricos e fixos, sem rastro de pilha, consulta ou identificador interno. | 2.5; RFD03 (2.1); tratamento de erros, neste item |

Fonte: elaborado pelos autores.

### Riscos residuais declarados

As decisões de projeto deixam riscos conhecidos sem mitigação dentro deste software. Registrá-los é parte da análise: risco não declarado é risco não gerenciado.

**Ataque distribuído por várias origens.** O limite do RNF05 é por endereço IP. Um atacante que distribua as tentativas por muitas origens permanece abaixo do limite em cada uma enquanto acumula tentativas contra a mesma conta. O controle que cobriria esse caso é o limite de falhas consecutivas por conta, previsto na NIST SP 800-63B e não adotado por exigir escrita de estado no repositório, conforme a premissa P04 do item 2.1.

**Penalização de usuários que compartilham endereço público.** O mesmo limite por IP atinge usuários legítimos atrás de NAT corporativo ou de operadora móvel. É disponibilidade trocada por resistência a força bruta, e a escolha está registrada em 2.1.

**Senha em texto claro no salto interno.** O RNF01 exige HTTPS na comunicação externa. O encaminhamento entre o servidor web e o servidor de aplicação ocorre em HTTP sobre a interface de loopback, de modo que a senha trafega sem cifra nesse trecho. O tráfego não deixa o host, e um atacante com acesso local ao servidor dispõe de caminhos mais diretos para obter a credencial, como a leitura da memória do processo. Por isso a equipe não adotou TLS no salto interno. A decisão deixa de valer se o servidor web e o servidor de aplicação passarem a ser implantados em hosts distintos, hipótese considerada no item 1.1 ao tratar do dimensionamento separado das camadas. Nesse caso o salto deixaria de ser interno e passaria a exigir cifra.

**Confiança em cabeçalho de origem.** O servidor web encaminha a requisição ao servidor de aplicação acrescentando o cabeçalho `X-Forwarded-For`. Esse cabeçalho pode ser forjado pelo cliente, e o servidor de aplicação não tem como distinguir o valor acrescentado pelo servidor web de um valor enviado pelo cliente, salvo por configuração explícita de confiança. Por isso o endereço de origem não é usado pela aplicação para decisão, e o registro desse endereço cabe ao servidor web, que observa o endereço real da conexão. Pelo mesmo motivo o RNF05 não é afetado: o limite de taxa é aplicado no servidor web.


### Política de registro

O RNF07 estabelece o que nunca é registrado. Esta seção detalha o que é registrado e com que finalidade.

**Registra-se, para cada tentativa de autenticação:** data e hora, endpoint acionado, código de status da resposta e resultado da decisão, autenticado ou não autenticado. Nas respostas da faixa 5xx registra-se também a classe do erro ocorrido, sem a qual o registro informaria que houve falha sem permitir diagnosticá-la.

O endereço de origem é registrado pelo servidor web, que observa o endereço real da conexão. O servidor de aplicação recebe a requisição pela interface de loopback e não tem acesso a esse endereço, salvo pelo cabeçalho encaminhado, cuja limitação consta dos riscos residuais. A correlação entre os dois registros se faz por data e hora.

**Nunca se registra:** a senha, o hash armazenado, o valor fictício, qualquer fragmento ou derivação de qualquer um deles, e o corpo da requisição. A OWASP relaciona senhas e identificadores de sessão entre os valores que não devem ser gravados em registro (OWASP, *Logging Cheat Sheet*).

A finalidade do registro é permitir identificar padrão de abuso, como sequência de falhas a partir de uma mesma origem. Essa finalidade é atendida pelos campos acima, sem necessidade de qualquer dado de credencial.

Há um limite conhecido no alcance desse registro. A resposta 429 é produzida pelo servidor web e não alcança o servidor de aplicação, conforme a DA07. Portanto as tentativas bloqueadas pelo limite de taxa não aparecem no registro da aplicação, e sim no do servidor web. A análise de abuso precisa considerar as duas origens de registro.

O endereço de origem pode constituir dado pessoal conforme a legislação aplicável, de modo que seu registro deve observar a política de retenção adotada pela organização que operar o serviço. O projeto não define prazo de retenção, por ser decisão de operação e não de arquitetura.

### Tratamento de erros

O serviço responde com corpos de erro fixos e genéricos. O princípio é que a resposta informe ao cliente o que ele precisa saber para agir, e nada sobre o funcionamento interno do serviço.

**Requisição malformada ou com campo fora do limite** produz 400, com corpo indicando requisição inválida, sem apontar qual campo falhou. Apontar o campo não ajudaria o cliente legítimo, que controla o que envia, e informaria ao atacante qual validação foi acionada.

**Credenciais inválidas** produzem 401, com corpo único, conforme o RNF03. A resposta é a mesma para usuário inexistente e para senha incorreta, em atendimento à orientação de não diferenciar mensagens de erro de autenticação (OWASP, *Authentication Cheat Sheet*).

**Corpo acima do limite** produz 413 e **excesso de tentativas** produz 429, ambos no servidor web, antes de a requisição alcançar a aplicação.

**Falha de processamento**, como indisponibilidade do repositório, produz resposta da faixa 5xx, conforme o RFD03. Essa distinção é deliberada: responder 401 quando a verificação não pôde ser realizada informaria ao cliente um resultado que não foi apurado. O corpo não revela a natureza da falha; o diagnóstico fica no registro do servidor.

Os códigos e corpos exatos constam do contrato do item 2.5.

### Fontes

- NIST. *Digital Identity Guidelines: Authentication and Lifecycle Management*. SP 800-63B. [20--]. Disponível em: https://pages.nist.gov/800-63-3/sp800-63b.html. Acesso em: 17 nov. 2026.
- OWASP. *Authentication Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- OWASP. *Logging Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- OWASP. *Password Storage Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. Acesso em: 17 nov. 2026.
- OWASP. *SQL Injection Prevention Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html. Acesso em: 17 nov. 2026.


# Referências {#refs}

BIRYUKOV, A.; DINU, D.; KHOVRATOVICH, D.; JOSEFSSON, S. *Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications*. RFC 9106. [S. l.]: IETF, set. 2021. Disponível em: https://www.rfc-editor.org/rfc/rfc9106. Acesso em: 17 nov. 2026.

CLOUDFLARE. *O que é DNS?* [20--]. Disponível em: https://www.cloudflare.com/pt-br/learning/dns/what-is-dns. Acesso em: 17 nov. 2026.

CLOUDFLARE. *What happens in a TLS handshake?* [20--]. Disponível em: https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake. Acesso em: 17 nov. 2026.

CLOUDFLARE. *What is TCP/IP?* [20--]. Disponível em: https://www.cloudflare.com/learning/ddos/glossary/tcp-ip. Acesso em: 17 nov. 2026.

EXPRESS. *Express Object*. [20--]. Disponível em: https://expressjs.com/en/api/express/. Acesso em: 17 nov. 2026.

EXPRESS. *Express: Node.js web application framework*. [20--]. Disponível em: https://expressjs.com/. Acesso em: 17 nov. 2026.

EXPRESS. *Response*. [20--]. Disponível em: https://expressjs.com/en/api/response/. Acesso em: 17 nov. 2026.

EXPRESS. *Routing*. [20--]. Disponível em: https://expressjs.com/en/guide/routing/. Acesso em: 17 nov. 2026.

EXPRESS. *Using middleware*. [20--]. Disponível em: https://expressjs.com/en/guide/using-middleware/. Acesso em: 17 nov. 2026.

FIELDING, R.; NOTTINGHAM, M.; RESCHKE, J. (ed.). *HTTP Semantics*. RFC 9110. [S. l.]: IETF, jun. 2022. Disponível em: https://www.rfc-editor.org/rfc/rfc9110. Acesso em: 17 nov. 2026.

FIELDING, R.; NOTTINGHAM, M.; RESCHKE, J. (ed.). *HTTP/1.1*. RFC 9112. [S. l.]: IETF, jun. 2022. Disponível em: https://www.rfc-editor.org/rfc/rfc9112. Acesso em: 17 nov. 2026.

ISO/IEC/IEEE. *42010:2022 – Software, systems and enterprise — Architecture description*. 2. ed. Genebra: ISO/IEC; IEEE, 2022. 62 p. Disponível em: https://www.iso.org/standard/74393.html. Acesso em: 17 nov. 2026.

MOZILLA. *Document Object Model (DOM)*. MDN Web Docs. [20--]. Disponível em: https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model. Acesso em: 17 nov. 2026.

MOZILLA. *HTML: HyperText Markup Language*. MDN Web Docs. [20--]. Disponível em: https://developer.mozilla.org/en-US/docs/Web/HTML. Acesso em: 17 nov. 2026.

MOZILLA. *HTTPS*. MDN Web Docs. [20--]. Disponível em: https://developer.mozilla.org/pt-BR/docs/Glossary/HTTPS. Acesso em: 17 nov. 2026.

MOZILLA. *Using the Fetch API*. MDN Web Docs. [20--]. Disponível em: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch. Acesso em: 17 nov. 2026.

NGINX. *Beginner's Guide*. [20--]. Disponível em: https://nginx.org/en/docs/beginners_guide.html. Acesso em: 17 nov. 2026.

NGINX. *Configuring HTTPS servers*. [20--]. Disponível em: https://nginx.org/en/docs/http/configuring_https_servers.html. Acesso em: 17 nov. 2026.

NGINX. *Module ngx_http_core_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_core_module.html. Acesso em: 17 nov. 2026.

NGINX. *Module ngx_http_limit_req_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html. Acesso em: 17 nov. 2026.

NGINX. *Module ngx_http_proxy_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_proxy_module.html. Acesso em: 17 nov. 2026.

NGINX. *Module ngx_http_v2_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_v2_module.html. Acesso em: 17 nov. 2026.

NGINX. *nginx documentation*. [20--]. Disponível em: https://nginx.org/en/docs/. Acesso em: 17 nov. 2026.

NIST. *Digital Identity Guidelines: Authentication and Lifecycle Management*. SP 800-63B. [20--]. Disponível em: https://pages.nist.gov/800-63-3/sp800-63b.html. Acesso em: 17 nov. 2026.

NODE-POSTGRES. *Pooling*. [20--]. Disponível em: https://node-postgres.com/features/pooling. Acesso em: 17 nov. 2026.

NODE-POSTGRES. *Queries*. [20--]. Disponível em: https://node-postgres.com/features/queries. Acesso em: 17 nov. 2026.

NODE-POSTGRES. *Result*. [20--]. Disponível em: https://node-postgres.com/apis/result. Acesso em: 17 nov. 2026.

NODE.JS. *AsyncWorker*. In: node-addon-api. [20--]. Disponível em: https://github.com/nodejs/node-addon-api/blob/main/doc/async_worker.md. Acesso em: 17 nov. 2026.

NODE.JS. *Don't Block the Event Loop (or the Worker Pool)*. [20--]. Disponível em: https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop. Acesso em: 10 nov. 2026.

NODE.JS. *Introduction to Node.js*. [20--]. Disponível em: https://nodejs.org/learn/getting-started/introduction-to-nodejs. Acesso em: 17 nov. 2026.

NODE.JS. *Node.js Documentation*. [20--]. Disponível em: https://nodejs.org/docs/latest/api/. Acesso em: 17 nov. 2026.

NODE.JS. *The Node.js Event Loop*. [20--]. Disponível em: https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick. Acesso em: 17 nov. 2026.

OWASP. *Authentication Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html. Acesso em: 17 nov. 2026.

OWASP. *Logging Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html. Acesso em: 17 nov. 2026.

OWASP. *Password Storage Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. Acesso em: 17 nov. 2026.

OWASP. *SQL Injection Prevention Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html. Acesso em: 17 nov. 2026.

POSTGRESQL GLOBAL DEVELOPMENT GROUP. *PostgreSQL Documentation*. [20--]. Disponível em: https://www.postgresql.org/docs/current/. Acesso em: 17 nov. 2026.

RANISALT. *argon2.cpp*. In: node-argon2. [20--]. Disponível em: https://github.com/ranisalt/node-argon2/blob/master/argon2.cpp. Acesso em: 17 nov. 2026.

RANISALT. *node-argon2*. [20--]. Disponível em: https://github.com/ranisalt/node-argon2#readme. Acesso em: 17 nov. 2026.

RESCORLA, E. *The Transport Layer Security (TLS) Protocol Version 1.3*. RFC 8446. [S. l.]: IETF, ago. 2018. Disponível em: https://www.rfc-editor.org/rfc/rfc8446. Acesso em: 17 nov. 2026.


# Apêndice I – Prompts submetidos à IA {#ap1}

::: pendente
[Pendente: aps/apendices/apendice-I.md]
:::


# Apêndice II – Registros de comunicação da equipe {#ap2}

**Fonte e método.** Registro reconstruído a partir da exportação do grupo de WhatsApp "PROJETO DE SOFTWARE WEB", de 22/10/2026 a 17/11/2026. A comunicação foi assíncrona: não há reunião síncrona registrada, e cada entrada corresponde a um dia de mensagens. Mensagens de mídia (prints) não constam na exportação e não foram interpretadas. Os trechos do Discord previstos na issue não foram fornecidos e não integram este registro.

**Participantes.** Grazieli, Kamilly, André e Lucas (gerente do trabalho).

## Registro por data

| Data | Participantes | Fatos e decisões | Pendências | Responsável |
|---|---|---|---|---|
| 22/10 | Grazieli, Lucas | Grupo criado por Grazieli. | — | — |
| 05/11 | Todos | Lucas assume a gerência; entrega final em 18/11. Divisão dos blocos: Grazieli A, Kamilly B, André C, Lucas D. Lucas pede as partes individuais até as 22h. Usuários do GitHub informados no grupo. | Cada membro entregar o seu bloco. | Cada membro |
| 06/11 | Kamilly, Grazieli | Kamilly informa que depende da primeira parte de Grazieli (1.1). Grazieli prevê concluir até a tarde de 07/11. | Entrega do 1.1. | Grazieli |
| 07/11 | Lucas | Lucas pede que todos aceitem os convites do projeto e do repositório. | Aceite dos convites. | Todos |
| 08/11 | Grazieli, Kamilly | Grazieli conclui o 1.1 e envia o PR #26; não conseguiu marcar André como revisor. | Revisão do PR #26. | André |
| 09/11 | André, Kamilly, Lucas, Grazieli | André entrega a revisão do PR #26 às 15h37, com melhorias e correções. Aceite dos convites confirmado por Grazieli. | Grazieli aplicar os ajustes. | Grazieli |
| 10/11 | Lucas, Kamilly, Grazieli | Lucas informa que depende do 2.1 e do 2.2 para começar o seu trabalho. G1 praticamente concluído, faltando o PR. 1.1 reenviado para correção. | PR do G1; 2.1 e 2.2. | Lucas; André |
| 11/11 | André, Grazieli, Kamilly, Lucas | André aprova o 1.1 e libera Kamilly; registra pendências para a equipe. Marco 4 enviado em 12/11; documento final em 18/11. Planning poker concluído por Grazieli; falta a documentação. Lucas pede itens fundamentais em PR e revisão até 13/11 e que André crie sub-issues com as pendências da issue mãe. | Sub-issues; documentação. | André; Grazieli |
| 15/11 | André, Lucas | André pergunta pelos próximos passos. Lucas responde que a equipe estava no hackathon. | Definir próximos passos. | Lucas |
| 16/11 | Kamilly, Lucas | Kamilly pede os prompts de IA de 22/10 a 11/11. Lucas informa que G1, G2 e 1.7 passam por ele e que haverá redistribuição das tarefas ligadas ao documento final. | Reunir prompts (G5); validar a entrega de Kamilly. | Lucas; Kamilly |
| 17/11 | Todos | README atualizado. PRs de Kamilly (1.2, 1.3, 1.4, 1.6) aprovados. André abre o PR do 2.1 e 2.2 às 14h12; Lucas pede alteração no G6. Às 16h22, na main: 1.1, 1.2, 1.3, 1.4, 1.6, 2.1, 2.2 e 2.3; G1, G2 e G6 em andamento; prazo de PRs às 18h. André conclui sua parte às 17h20 e o PR é aprovado às 17h29. Kamilly conclui às 20h58 e os PRs são aprovados às 22h19. | Ver fechamento de 22h57. | — |
| 17/11, 22h57 | Lucas | Pendências para 18/11: 1.5 sem PR (o 1.7 faz remissão a ele); 2.5 sem PR; G5 e slides do G9 prontos para a leitura final. Demais itens mesclados na main. | PRs de 1.5 e 2.5; G5; slides do G9. | — |
| 17/11, 23h26 | — | No GitHub, após o fechamento: PR do 1.5 aberto (#63). | PR do 2.5; G5; slides do G9. | — |
