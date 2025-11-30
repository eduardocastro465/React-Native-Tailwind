flujo completo:

Autentica con Google (Firebase) y obtiene uid, email, displayName y photoURL.


  // 🔥 GOOGLE LOGIN NATIVO (Firebase)
  const loginWithGoogle = async () => {
    if (isLocked) {
      setErrorMessage(`Demasiados intentos. Intenta en ${remainingTime} s.`);
      return;
    }

    try {
      setIsGoogleLoading(true);
      setErrorMessage("");

      // Verificar Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Selección de cuenta Google
      const userInfo = await GoogleSignin.signIn();

      // Obtener token de Google
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error("Google no regresó un idToken.");

      // Credencial Firebase
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Login Firebase
      const userCredential = await auth().signInWithCredential(googleCredential);

      // Email robusto
      const userEmail = userCredential.user.email || userCredential.user.providerData[0]?.email;
      if (!userEmail) throw new Error("No se pudo obtener el email del usuario.");

      // Construir objeto para tu backend
      const usuario = {
        uid: userCredential.user.uid,
        email: userEmail,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
      };

      // 🔥 Llamada a tu API usando AuthService
      const response: any = await AuthService.signInWithSocial(usuario);

      if (!response.token || !response.usuario) {
        throw new Error("Respuesta inválida del servidor.");
      }

      // Guardar usuario y token localmente
      await AsyncStorage.setItem("token", response.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.usuario));

      router.replace("/home");

    } catch (error: any) {
      console.log("Google Login Error:", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setErrorMessage("El usuario canceló el inicio de sesión.");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setErrorMessage("Inicio de sesión en proceso...");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMessage("Google Play Services no disponible o desactualizado.");
      } else if (error.status === 403 && error.error?.tiempo) {
        setErrorMessage(error.error.message || "Cuenta bloqueada.");
        startCountdown(error.error.tiempo);
      } else {
        setErrorMessage(error.message || "Error inesperado.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };





Envía estos datos a tu API Node.js usando signInWithSocial de AuthService.


 async signInWithSocial(userData: any): Promise<IToken> {
    try {
      const response = await ApiService.post<IToken>('/autentificacion/signIn-Google-Facebook', userData);
      if (response.token) {
        await this.saveToken(response.token);
      }
      return response;
    } catch (error: any) {
      throw error;
    }
  },


Tu API valida o crea el usuario, genera JWT y devuelve { token, usuario }.

exports.signInGoogleFacebook = async (req, res) => {
  try {
    const sanitizedData = sanitizeObject(req.body);
    const { displayName, email, photoURL, uid } = sanitizedData;

    if (!email) {
      return res.status(400).json({ message: "El email es requerido" });
    }

    // Buscar usuario existente
    let usuario = await Usuario.findOne({ email }).populate("estadoCuenta");

    if (usuario) {
      // Manejar cuenta existente
      const estadoCuenta = usuario.estadoCuenta;

      if (estadoCuenta.estado === "bloqueada") {
        const ahora = Date.now();
        const tiempoRestante =
          estadoCuenta.fechaDeUltimoBloqueo.getTime() +
          estadoCuenta.tiempoDeBloqueo * 1000 -
          ahora;

        if (tiempoRestante > 0) {
          return res.status(403).json({
            message: `Cuenta bloqueada. Intenta nuevamente en ${Math.ceil(
              tiempoRestante / 1000
            )} segundos.`,
            tiempo: estadoCuenta.tiempoDeBloqueo,
            numeroDeIntentos: estadoCuenta.intentosFallidos,
          });
        }

        // Restablecer cuenta bloqueada
        estadoCuenta.estado = "activa";
        estadoCuenta.intentosFallidos = 0;
        estadoCuenta.fechaDeUltimoBloqueo = null;
        await estadoCuenta.save();
      }
    } else {
      // Crear nuevo usuario para Google/Facebook
      const primerUsuario = await Usuario.findOne().populate("estadoCuenta");
      if (!primerUsuario || !primerUsuario.estadoCuenta) {
        return res.status(500).json({
          message: "No se pudo obtener la configuración de estado de cuenta"
        });
      }

      const { intentosPermitidos, tiempoDeBloqueo } = primerUsuario.estadoCuenta;
      const nuevoEstadoCuenta = await EstadoCuenta.create({
        intentosPermitidos,
        tiempoDeBloqueo,
        estado: "activa"
      });

      usuario = await Usuario.create({
        fotoDePerfil: photoURL,
        nombre: displayName,
        email,
        estadoCuenta: nuevoEstadoCuenta._id,
        token: "",
        codigoVerificacion: null,
        verificado: true, // Usuarios de redes sociales verificados
        rol: "usuario", // Rol por defecto
        uid // ID único del proveedor OAuth
      });

      usuario = await Usuario.findById(usuario._id).populate("estadoCuenta");
    }

    // Resetear intentos fallidos
    usuario.estadoCuenta.intentosFallidos = 0;
    await usuario.estadoCuenta.save();

    // Generar token JWT
    const token = jwt.sign(
      { _id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "24h" }
    );

    // Configurar cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 86400000, // 24 horas en ms
    });

    return res.status(200).json({
      token,
      rol: usuario.rol,
      usuario: {
        nombre: usuario.nombre,
        email: usuario.email,
        fotoDePerfil: usuario.fotoDePerfil
      }
    });

  } catch (error) {
    console.error("Error en el servidor:", error);
    return res.status(500).json({
      message: "Error en el servidor",
      error: error.message
    });
  }
};

React Native guarda token y usuario en AsyncStorage.


  // Guardar usuario y token localmente
      await AsyncStorage.setItem("token", response.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.usuario));



Maneja cuentas bloqueadas con countdown, errores y cancelaciones de usuario.