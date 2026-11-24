
class AuthenticationService {
  constructor(userRepository, passwordHasher, dummyHash) {
    if (!dummyHash) {
      throw new Error('Hash fictício obrigatório');
    }

    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.dummyHash = dummyHash;
  }

  async authenticate(email, senha) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);

    // Executar Argon2id mesmo quando o e-mail não existir.
    // Isso reduz diferenças de tempo entre as falhas.
    const hash = user ? user.senha_hash : this.dummyHash;

    const isValid = await this.passwordHasher.verify(hash, senha);

    if (!user || !isValid) {
      return null;
    }

    // Nunca retornar o hash da senha.
    return {
      id: user.id,
      email: user.email,
      nome: user.nome
    };
  }
}

module.exports = { AuthenticationService };
